/** Add delivery optimizations only to first-party Cloudinary upload URLs. */
export function getCloudinaryImageUrl(
  source: string,
  options: { width: number; catalogCrop?: boolean },
) {
  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      !url.pathname.includes("/image/upload/")
    ) {
      return source;
    }

    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker) + marker.length;
    const pathBeforeAsset = url.pathname.slice(0, markerIndex);
    const pathSegments = url.pathname.slice(markerIndex).split("/");
    const transformations = options.catalogCrop
      ? `c_fill,ar_4:5,g_auto,w_${options.width}/f_auto/q_auto`
      : `c_limit,w_${options.width}/f_auto/q_auto`;
    const versionIndex = pathSegments.findIndex((segment) =>
      /^v\d+$/.test(segment),
    );

    if (versionIndex > 0) {
      const existingTransformations = pathSegments.slice(0, versionIndex);
      const versionAndAsset = pathSegments.slice(versionIndex);
      url.pathname = `${pathBeforeAsset}${[...existingTransformations, ...transformations.split("/"), ...versionAndAsset].join("/")}`;
    } else {
      url.pathname = `${pathBeforeAsset}${transformations}/${pathSegments.join("/")}`;
    }
    return url.toString();
  } catch {
    return source;
  }
}
