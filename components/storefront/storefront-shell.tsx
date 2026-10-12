import type { ReactNode } from "react";

import type { StorefrontStore } from "../../lib/queries";
import {
  getStorefrontBranding,
  getStorefrontThemeStyle,
} from "../../lib/storefront-theme";
import { StorefrontHeader } from "./storefront-header";

export function StorefrontShell({
  store,
  query,
  children,
}: {
  store: StorefrontStore;
  query?: string;
  children: ReactNode;
}) {
  const { logoUrl } = getStorefrontBranding(store);

  return (
    <div className="storefront-shell" style={getStorefrontThemeStyle(store)}>
      <StorefrontHeader store={store} logoUrl={logoUrl} query={query} />
      <div className="storefront-shell__content">{children}</div>
      <footer className="storefront-footer">
        <div className="storefront-footer__inner">
          <span className="storefront-footer__name">{store.name}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
