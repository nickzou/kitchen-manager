# Kitchen Manager API

Reference for the HTTP API. Every action available in the GUI is also available here.

> **Maintenance:** any change to a route under `src/routes/api/**` (new endpoint, new method, new request/response field, behavior change) must update this file in the same PR so the reference stays in sync.

## Authentication

All endpoints (except the auth catchall and uploads served by `GET /api/uploads/$filename`) require a session. Two ways to authenticate:

- **Bearer API key**: `Authorization: Bearer km_<hex>`. Manage keys via `/api/api-keys` or the **Profile → API Keys** page in the GUI.
- **Session cookie**: set by the Better Auth flow at `/api/auth/*`. Used by the web UI; not typically used by external clients.

Unauthenticated requests return `401 { "error": "Unauthorized" }`.

All resources are scoped to the authenticated user — the API never crosses tenants. You cannot read or modify another user's data with your key.

## Base URLs

- Production: `https://kitchen-manager.waffleruntime.com`
- Staging: `https://staging.kitchen-manager.waffleruntime.com`

## Conventions

- All bodies are JSON unless noted (image upload accepts `multipart/form-data`).
- Numeric quantities are sent as strings to preserve precision (Postgres `numeric` columns).
- Errors return `{ "error": "..." }` with an appropriate 4xx / 5xx status.
- Response shapes mirror the Drizzle row schema; consult `src/db/schema.ts` for the full field list.
- Names on user-scoped lookup tables (brands, stores, quantity units, product categories, recipe categories, recipes, products) are unique per user, **case-insensitive**. Creating or renaming to a duplicate name returns `409 { "error": "A <thing> with this name already exists" }`.

---

## Recipes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/recipes` | List the user's recipes. |
| `POST` | `/api/recipes` | Create a recipe. Body: `{ name, description?, image?, servings?, prepTime?, cookTime?, instructions?, categoryIds?, producedProductId?, producedQuantity?, producedQuantityUnitId?, isMealPrep?, source? }`. `isMealPrep: true` flags a recipe whose calories/cost are excluded from the meal-plan day totals on the day it's planned (you cooked it, you didn't eat it). `source` is an optional URL pointing to where the recipe came from. |
| `GET` | `/api/recipes/$id` | Fetch one recipe (with category ids). |
| `PUT` | `/api/recipes/$id` | Update any subset of recipe fields. |
| `DELETE` | `/api/recipes/$id` | Delete a recipe. |
| `GET` | `/api/recipes/availability` | Per-recipe stock availability. Returns `{ [recipeId]: "sufficient" \| "deficit" \| "no-ingredients" }`. Honors group "any sufficient" and skips optional ingredients. |
| `POST` | `/api/recipes/cook` | Cook a recipe outside of meal-plan context. Body: `{ recipeId, servings?, groupSelections?, ingredientOverrides?, skippedIngredients? }`. `groupSelections` is `{ [groupName]: ingredientId }` for groups that need a choice. `ingredientOverrides` is `{ [ingredientId]: { quantity, quantityUnitId } }` and replaces the recipe's stored amount for that ingredient (no scaling applied — the value is taken as-is). `skippedIngredients` is `string[]` of ingredient IDs to skip entirely (used by the cook modal when a user unchecks an optional ingredient). Deducts stock FIFO, writes `stock_log` rows, and (if the recipe has `producesProductId`) adds the produced quantity to stock. |

### Recipe ingredients

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/recipes/$id/ingredients` | List ingredients on a recipe. |
| `POST` | `/api/recipes/$id/ingredients` | Add an ingredient. Body: `{ quantity, productId?, quantityUnitId?, notes?, groupName?, optional?, skipStockDeduction?, sortOrder? }`. |
| `PUT` | `/api/recipes/$id/ingredients/$ingredientId` | Update any subset of the above fields. |
| `DELETE` | `/api/recipes/$id/ingredients/$ingredientId` | Remove an ingredient. |

### Recipe prep steps

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/recipes/$id/prep-steps` | List prep steps on a recipe. |
| `POST` | `/api/recipes/$id/prep-steps` | Add a prep step. Body: `{ description, leadTimeMinutes?, sortOrder? }`. |
| `PUT` | `/api/recipes/$id/prep-steps/$stepId` | Update a prep step. |
| `DELETE` | `/api/recipes/$id/prep-steps/$stepId` | Remove a prep step. |

---

## Products

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List products with `categoryIds`. |
| `POST` | `/api/products` | Create a product. Body: `{ name, description?, image?, isFood?, defaultQuantityUnitId?, minStockAmount?, defaultExpirationDays?, defaultConsumeAmount?, defaultConsumeUnitId?, calories?, protein?, fat?, carbs?, nutritionBaseAmount?, nutritionBaseUnitId?, defaultTareWeight?, defaultSkipStockDeduction?, categoryIds? }`. `defaultSkipStockDeduction` is the per-product default applied to new recipe ingredients that link to this product (the user can still override per-ingredient). |
| `GET` | `/api/products/$id` | Fetch one product. |
| `PUT` | `/api/products/$id` | Update any subset of fields. Also accepts `pinned` (boolean) and `pinnedSortOrder` (integer or null) to control whether the product appears in the dashboard's Pinned section and its display order. |
| `DELETE` | `/api/products/$id` | Delete a product (cascades stock entries / recipe ingredient links). |

### Product-specific unit conversions

Conversions defined here override the global ones for the given product.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products/$id/unit-conversions` | List a product's overrides. |
| `POST` | `/api/products/$id/unit-conversions` | Create one. Body: `{ fromUnitId, toUnitId, factor }`. |
| `GET` | `/api/products/$id/unit-conversions/$conversionId` | Fetch one. |
| `PUT` | `/api/products/$id/unit-conversions/$conversionId` | Update fields. |
| `DELETE` | `/api/products/$id/unit-conversions/$conversionId` | Remove the override. |
| `GET` | `/api/product-unit-conversions` | List all product-specific conversions across all products (read-only convenience). |

### Source recipes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products/$id/source-recipes` | Recipes that produce this product (their `producedProductId` matches `$id`). Returns `[{ id, name, producedQuantity, producedQuantityUnitId, derivedNutrition }]`, where `derivedNutrition` is `{ calories, protein, fat, carbs, baseAmount, baseUnitId, complete }` (per `producedQuantity` of `producedQuantityUnitId`) or `null` if the recipe has no produced quantity/unit. Used to surface "produced by" links, the derived nutrition display on the product detail page, and to mark producible products in the shopping-list summary. |
| `GET` | `/api/products/derived-nutrition` | Per-product derived nutrition for every producible product owned by the user. Returns `{ [productId]: { calories, protein, fat, carbs, baseAmount, baseUnitId, complete } }`. Used by the client-side recipe/meal-plan nutrition rollups so produced ingredients (e.g. a meal-prepped sauce) contribute their source recipe's macros. First-wins if multiple recipes produce the same product. |
| `GET` | `/api/products/derived-cost` | Per-product derived cost. Returns `{ [productId]: { total, baseAmount, baseUnitId, complete } }`, where `total` is the cost of producing one batch (`baseAmount` of `baseUnitId`) computed from the source recipe's priced ingredients. Same first-wins semantics as derived-nutrition. |

---

## Stock

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/stock-entries` | List stock entries. |
| `POST` | `/api/stock-entries` | Create a stock entry. Body: `{ productId, quantity, expirationDate?, purchaseDate?, price?, storeId?, brandId?, tareWeight? }`. Writes a `stock_log` row with `transactionType: "add"`. |
| `GET` | `/api/stock-entries/$id` | Fetch one. |
| `PUT` | `/api/stock-entries/$id` | Update fields. |
| `DELETE` | `/api/stock-entries/$id` | Remove the entry. Writes `transactionType: "remove"` log. |
| `POST` | `/api/stock-entries/consume` | Subtract quantity. Body: `{ stockEntryId, quantity }`. Deletes the entry when it reaches 0; writes `consume` log. Returns `{ ...entry, stockLogId }`. |
| `POST` | `/api/stock-entries/spoil` | Same shape as consume; writes `spoiled` log. |

### Stock logs

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/stock-logs` | Paginated activity log. Query params: `productId?`, `transactionType?`, `limit` (default 50, max 100), `offset`. Returns `{ logs, total }`. |
| `GET` | `/api/stock-logs/$id` | Fetch one log. |
| `PUT` | `/api/stock-logs/$id` | Edit a log entry (rare — usually admin-style). |
| `DELETE` | `/api/stock-logs/$id` | Delete a log entry. |
| `POST` | `/api/stock-logs/reverse` | Undo a log: applies the opposite transaction to stock and deletes the log. Body: `{ stockLogId, stockEntryId? }`. Used by the GUI's "Undo" toast and stock activity reversal. |

---

## Meal Plan

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/meal-plan-entries` | List entries. Optional query: `startDate`, `endDate` (`YYYY-MM-DD`). |
| `POST` | `/api/meal-plan-entries` | Create an entry. Body: `{ recipeId, date, mealSlotId, servings? }`. |
| `GET` | `/api/meal-plan-entries/$id` | Fetch one. |
| `PUT` | `/api/meal-plan-entries/$id` | Update fields. |
| `DELETE` | `/api/meal-plan-entries/$id` | Delete an entry. |
| `POST` | `/api/meal-plan-entries/cook` | Mark an entry cooked. Body: `{ mealPlanEntryId, groupSelections?, ingredientOverrides?, skippedIngredients? }`. `ingredientOverrides` and `skippedIngredients` follow the same shape as `/api/recipes/cook`. Stamps `cookedAt`, deducts stock FIFO, writes consume logs, optionally produces stock. |
| `DELETE` | `/api/meal-plan-entries/cook` | Uncook (reverse) an entry. Body: `{ mealPlanEntryId }`. Restores stock from the entry's consume logs. |
| `GET` | `/api/meal-plan-entries/ingredient-summary` | Shopping-list summary for a date range. Query: `startDate`, `endDate`. Returns `{ ingredients, unlinkedIngredients, restock, producible }`. Applies group rule with running-stock simulation across all entries in the range. Each row carries a `recipes[]` of contributing meal-plan entries. Ingredients whose product is the output of a recipe (see `/api/products/$id/source-recipes`) are routed into `producible[]` (with `sourceRecipeId`/`sourceRecipeName`) instead of `ingredients[]` or `restock[]`, so they're surfaced for cooking rather than buying. |
| `GET` | `/api/meal-plan-entries/nutrition-summary` | Aggregate nutrition for the date range. Query: `startDate`, `endDate`. When an ingredient's product has no own nutrition but is produced by a recipe, the macros are derived from that source recipe's ingredients (scaled by produced quantity). |
| `GET` | `/api/meal-plan-entries/cost-summary` | Aggregate cost for the date range. Query: `startDate`, `endDate`. Returns `{ "YYYY-MM-DD": { total, complete } }`. Per-ingredient cost = avg `unit_cost` across the user's stock entries for that product × ingredient qty (converted to the product's default unit) × entry/recipe servings ratio. Ingredient groups are averaged across alternatives, mirroring the nutrition rollup. `complete: false` flags days where one or more ingredients had no priced stock entry or a unit-conversion gap. |

### Meal slots

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/meal-slots` | List the user's meal slots, ordered by `sortOrder`. |
| `POST` | `/api/meal-slots` | Create a slot. Body: `{ name, sortOrder? }`. |
| `GET` | `/api/meal-slots/$id` | Fetch one. |
| `PUT` | `/api/meal-slots/$id` | Update name or sort order. |
| `DELETE` | `/api/meal-slots/$id` | Remove a slot. |
| `PUT` | `/api/meal-slots/reorder` | Bulk reorder. Body: `{ orderedIds: string[] }`. The array order becomes the `sortOrder`. |

---

## Categories

Recipe and product categories share the same shape.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/recipe-categories` | List recipe categories. |
| `POST` | `/api/recipe-categories` | Create. Body: `{ name, description? }`. |
| `GET` / `PUT` / `DELETE` | `/api/recipe-categories/$id` | Standard CRUD. |
| `GET` | `/api/product-categories` | List product categories with `{ id, name, description, minStockAmount, minStockUnitId }`. |
| `POST` | `/api/product-categories` | Create. Body: `{ name, description?, minStockAmount?, minStockUnitId? }`. `minStockAmount` is a category-level minimum across all products in the category, expressed in `minStockUnitId`. |
| `GET` / `PUT` / `DELETE` | `/api/product-categories/$id` | Standard CRUD. PUT accepts the same fields as POST (all optional). |

---

## Reference data

### Quantity units

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/quantity-units` | List units. |
| `POST` | `/api/quantity-units` | Create. Body: `{ name, abbreviation? }`. |
| `GET` / `PUT` / `DELETE` | `/api/quantity-units/$id` | Standard CRUD. |

### Global unit conversions

Used as a fallback when no product-specific conversion exists.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/unit-conversions` | List global conversions. |
| `POST` | `/api/unit-conversions` | Create. Body: `{ fromUnitId, toUnitId, factor }`. |
| `GET` / `PUT` / `DELETE` | `/api/unit-conversions/$id` | Standard CRUD. |

### Brands

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/brands` | List brands. |
| `POST` | `/api/brands` | Create. Body: `{ name }`. |
| `GET` / `PUT` / `DELETE` | `/api/brands/$id` | Standard CRUD. |

### Stores

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/stores` | List stores. |
| `POST` | `/api/stores` | Create. Body: `{ name }`. |
| `GET` / `PUT` / `DELETE` | `/api/stores/$id` | Standard CRUD. |

---

## Shopping List

Manual additions to the shopping list — items the user wants to buy that aren't tied to a planned meal or a below-min staple.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/shopping-list-items` | List the user's manual shopping list items, newest first. |
| `POST` | `/api/shopping-list-items` | Create one. Body: `{ productId, quantity, quantityUnitId? }`. `quantity` is stored as a string (numeric column). |
| `GET` / `PUT` / `DELETE` | `/api/shopping-list-items/$id` | Standard CRUD. PUT accepts any subset of `productId`, `quantity`, `quantityUnitId`. |

---

## Account

### User settings

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/user-settings` | Fetch the current user's settings (`advancedMode`, `apiEnabled`, `webhooksEnabled`, `nutritionEnabled`, `weekStartDay`). |
| `PUT` | `/api/user-settings` | Update any subset of those fields. |

### API keys

API key management lives behind the `apiEnabled` user setting in the GUI; the endpoints work as long as you have a session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/api-keys` | List the user's keys (without the secret — only `keyPrefix` is returned). |
| `POST` | `/api/api-keys` | Create a key. Body: `{ name }`. **Returns the raw `key` once** (`km_<64 hex>`); store it immediately, the API will only show the prefix afterward. |
| `DELETE` | `/api/api-keys/$id` | Revoke a key. |

### Auth

`GET / POST /api/auth/*` is a catchall that delegates to Better Auth. Sign-in, sign-up, password reset, email verification, and session checks all flow through it. External integrations should authenticate via API keys instead of these endpoints.

---

## Webhooks

Outgoing webhook subscriptions for stock and cooking events.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/webhooks` | List webhook endpoints. |
| `POST` | `/api/webhooks` | Create. Body: `{ name, url, secret?, events: string[] }` (e.g. `["stock.entry.created", "stock.entry.consumed", "stock.log.reversed"]`). |
| `GET` / `PUT` / `DELETE` | `/api/webhooks/$id` | Standard CRUD. |
| `POST` | `/api/webhooks/retry` | Force a retry pass over `pending`/`failed` deliveries. Returns delivery stats. |

Each delivery is signed with HMAC-SHA256 over the JSON payload using the endpoint's secret; verify the `X-KM-Signature` header on your receiver.

---

## Uploads

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/uploads` | Upload an image. Two body shapes accepted: (1) `multipart/form-data` with a `file` field; (2) `application/json` with `{ url }` to download from a remote URL. Server resizes to ≤ 1200×1200 and re-encodes to WebP (SVG is passed through). 5 MB cap on inputs. Response: `{ url: "/api/uploads/<filename>" }`. |
| `GET` | `/api/uploads/$filename` | Public read of an uploaded image (no auth required). |

---

## Endpoint index

Quick lookup grouped by file:

```
api-keys/                    GET, POST       /api/api-keys
api-keys/$id                 DELETE          /api/api-keys/$id
auth/$                       GET, POST       /api/auth/* (Better Auth)
brands/                      GET, POST       /api/brands
brands/$id                   GET, PUT, DELETE
meal-plan-entries/           GET, POST       /api/meal-plan-entries
meal-plan-entries/$id        GET, PUT, DELETE
meal-plan-entries/cook       POST, DELETE    cook / uncook
meal-plan-entries/ingredient-summary   GET   shopping list aggregate
meal-plan-entries/nutrition-summary    GET   nutrition aggregate
meal-plan-entries/cost-summary         GET   cost aggregate
meal-slots/                  GET, POST
meal-slots/$id               GET, PUT, DELETE
meal-slots/reorder           PUT             bulk reorder
product-categories/          GET, POST
product-categories/$id       GET, PUT, DELETE
product-unit-conversions/    GET             list across products
products/                    GET, POST
products/$id                 GET, PUT, DELETE
products/$id/unit-conversions/                GET, POST
products/$id/unit-conversions/$conversionId   GET, PUT, DELETE
products/$id/source-recipes  GET             recipes producing this product
quantity-units/              GET, POST
quantity-units/$id           GET, PUT, DELETE
recipe-categories/           GET, POST
recipe-categories/$id        GET, PUT, DELETE
recipes/                     GET, POST
recipes/$id                  GET, PUT, DELETE
recipes/$id/ingredients/                      GET, POST
recipes/$id/ingredients/$ingredientId         PUT, DELETE
recipes/$id/prep-steps/                       GET, POST
recipes/$id/prep-steps/$stepId                PUT, DELETE
recipes/availability         GET             per-recipe sufficient/deficit
recipes/cook                 POST            cook outside meal plan
stock-entries/               GET, POST
stock-entries/$id            GET, PUT, DELETE
stock-entries/consume        POST
stock-entries/spoil          POST
stock-logs/                  GET             paginated
stock-logs/$id               GET, PUT, DELETE
stock-logs/reverse           POST            undo a log
shopping-list-items/         GET, POST       manual list items
shopping-list-items/$id      GET, PUT, DELETE
stores/                      GET, POST
stores/$id                   GET, PUT, DELETE
unit-conversions/            GET, POST
unit-conversions/$id         GET, PUT, DELETE
uploads/                     POST            multipart or { url }
uploads/$filename            GET             public read
user-settings/               GET, PUT
webhooks/                    GET, POST
webhooks/$id                 GET, PUT, DELETE
webhooks/retry               POST
```
