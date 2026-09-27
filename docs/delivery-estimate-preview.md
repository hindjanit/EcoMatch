# Route-based delivery and checkout preview

- Deal room sends only its deal ID. The server authenticates the participant, retrieves seller pickup and agreed product price, and ignores any submitted price, pickup, distance or total.
- Exact seller coordinates are read under the caller's existing database permissions, or with the existing server key after participant authorization. If only the public area pin is accessible, the estimate is explicitly approximate. No permissions or migrations are changed by this feature.
- Buyer device location is requested as the default. Permission denial or failure leaves address search available. Seller accounts do not automatically use their device as the buyer destination.
- Changing destination text clears its old coordinates and quote. An address search result must be selected before calculating. In-flight old responses cannot overwrite a newer selection.
- Road distance is calculated by the server using the [OSRM route API](https://project-osrm.org/docs/v5.24.0/api/), with a 12-second timeout. No straight-line or invented distance fallback is used. Routing failure asks the user to retry. Coverage is limited to 200 km, with a 500 m road-snap limit.
- OSRM driving routes are a planning estimate, not truck-restriction-aware dispatch routing. Freight suitability, final addresses, fees, taxes and carrier acceptance must be confirmed before any real booking.
- The public standalone page has a clearly labelled sample seller in Okhla and a fixed ₹15,000 product. It is not linked to a real deal. Deal pages use their own seller and price.
- Checkout combines product, estimated transport and the illustrative 10% logistics service fee into one displayed total. No funds, booking, database state or ownership changes occur.
- Search text goes to the existing Photon lookup. Route coordinates go to OSRM; this is disclosed in the form. These preview endpoints do not persist addresses.
- Coordinates selected by the buyer describe the requested destination; GPS itself is not tamper-proof. Future real payment must use a persisted, expiring server quote and revalidate address changes. This preview is never an authorization to charge or settle.

Validation: estimator and routing/API tests (6), scoped ESLint, production build; browser address selection, live sample road calculation, checkout and edit invalidation.
