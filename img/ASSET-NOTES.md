# Image asset notes

## Genuine product screenshots (DDM)

Source PNGs captured from live DDM platforms. Retained as fallbacks.

| File | Source | Licence / notes |
| --- | --- | --- |
| `honamarketplace.png` | https://honamarketplace.com/ | DDM project screenshot — site use |
| `propservice.png` | https://propservice.web.app/ | DDM project screenshot — site use. Current capture is the public sign-in / workspace entry screen. No safer authenticated dashboard asset exists in this repo. |
| `elegantlaine.png` | https://elegantlaine.co.za/ | DDM project screenshot — site use |
| `liberty-homes.co.za.png` | https://liberty-homes.co.za/ | DDM project screenshot — site use. Current capture is the public sign-in screen. No safer authenticated resident-dashboard asset exists in this repo. |

## Optimised WebP derivatives

Generated locally with `sharp` (quality ~80–82, max width 1600 / 800). Not third-party stock.

| File | Derived from |
| --- | --- |
| `hona-hero.webp`, `hona-hero-800.webp` | `honamarketplace.png` |
| `propservice.webp`, `propservice-800.webp` | `propservice.png` |
| `elegantlaine.webp`, `elegantlaine-800.webp` | `elegantlaine.png` |
| `liberty-homes.webp`, `liberty-homes-800.webp` | `liberty-homes.co.za.png` |

## Treatment (polish pass)

- PropService and Liberty Homes keep the existing genuine sign-in screens.
- Presentation improved via `object-position: left center` so branding and product messaging in the left panel remain readable in cropped frames.
- No fabricated dashboards, stock photography, or AI-generated interfaces were introduced.
- No stock photography or AI-generated people were added for this redesign.
