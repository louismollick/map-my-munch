# Map My Munch

Map My Munch turns scattered editorial food recommendations into a consensus restaurant shortlist for a place and food intent.

## Language

**Recommendation Run**:
One user workflow from **Place** and **Category** to ranked restaurant results.
_Avoid_: Request, search job

**Place**:
A free-text location users want food recommendations for; may be a city, neighborhood, or region.
_Avoid_: City

**Category**:
A free-text food intent such as breakfast, pasta, gelato, or tacos.
_Avoid_: Cuisine taxonomy

**Source**:
An editorial recommendation article considered during a **Recommendation Run**.
_Avoid_: Directory, rating aggregator, map result

**Restaurant**:
A specific restaurant location when address or geocoding evidence can distinguish it.
_Avoid_: Brand, chain

**Mention**:
One **Source** reference to a **Restaurant**, with available rank or order evidence.
_Avoid_: Listing, citation

## Example Dialogue

Dev: "A Recommendation Run for gelato in Rome found eight Sources."

Domain expert: "Good. Each Mention should preserve whether the Source ranked it or only included it."

Dev: "Two Sources mention the same brand but Google resolves different addresses."

Domain expert: "Treat them as separate Restaurants unless the address or geocode shows they are the same location."
