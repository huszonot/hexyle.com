window.AppShopify = (() => {
  const API_VERSION = '2024-04';

  async function gql(query, variables = {}) {
    const endpoint = `https://${window.SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': window.SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`Shopify API hiba: ${res.status} ${res.statusText}`);

    const json = await res.json();
    if (json.errors?.length) throw new Error(`GraphQL hiba: ${json.errors[0].message}`);
    return json.data;
  }

  async function fetchProducts(cursor = null) {
    const query = `
      query FetchProducts($cursor: String) {
        products(first: 20, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              priceRange { minVariantPrice { amount currencyCode } }
              images(first: 1) { edges { node { url altText } } }
              variants(first: 1) { edges { node { id } } }
            }
          }
        }
      }
    `;

    const data = await gql(query, { cursor });

    const products = data.products.edges.map(edge => {
      const node = edge.node;
      const price = node.priceRange.minVariantPrice;
      const imageEdge = node.images.edges[0];
      const variantEdge = node.variants.edges[0];
      return {
        id: node.id,
        variantId: variantEdge?.node.id ?? null,
        title: node.title,
        price: price.amount,
        currency: price.currencyCode,
        imageUrl: imageEdge?.node.url ?? null,
        imageAlt: imageEdge?.node.altText ?? node.title,
      };
    }).filter(p => p.imageUrl !== null && p.variantId !== null);

    return { products, pageInfo: data.products.pageInfo };
  }

  /**
   * Shopify cart létrehozása és checkout URL visszaadása.
   * @param {Array<{variantId: string, quantity: number}>} lines
   * @returns {Promise<string>} checkoutUrl
   */
  async function createCart(lines) {
    const query = `
      mutation CartCreate($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { checkoutUrl }
          userErrors { field message }
        }
      }
    `;

    const data = await gql(query, { lines });

    const errors = data.cartCreate.userErrors;
    if (errors.length) throw new Error(errors.map(e => e.message).join(', '));

    return data.cartCreate.cart.checkoutUrl;
  }

  return { fetchProducts, createCart };
})();
