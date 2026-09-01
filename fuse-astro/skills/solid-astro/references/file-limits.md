---
name: file-limits
applies-to: "**/*.astro"
---

# Source-size ceiling in Astro

## The Rule

**Source files must not exceed `FUSE_SOLID_MAX_LINES` (default 200). Split by responsibility when cohesion drops.**

This is not a stylistic preference — it enforces Single Responsibility and prevents "god components."

## Responsibility guidance by file type

| File Type | Cohesion guidance | Action when cohesion drops |
|-----------|--------------------|----------------------------|
| Page (`.astro` in `pages/`) | Compose routes only | Extract components |
| Layout component | Own page framing | Extract sections |
| UI component | Own one UI concern | Split into sub-components |
| Service / utility | Own one domain operation | Extract helper functions |
| Content schema | Own one schema domain | Split into sub-schemas |
| Interface file | Group one contract domain | Split by domain |

Every source-file type uses `FUSE_SOLID_MAX_LINES` (default 200) as the only numeric size ceiling.

## How to Split a Page

```astro
<!-- BAD: 80-line page doing everything -->
<!-- src/pages/index.astro -->

<!-- GOOD: Page as composition of focused components -->
---
// src/pages/index.astro — composition only
import HeroSection from '../components/home/HeroSection.astro';
import FeaturesGrid from '../components/home/FeaturesGrid.astro';
import TestimonialsSlider from '../components/home/TestimonialsSlider.astro';
import CtaSection from '../components/home/CtaSection.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { getHomeData } from '../lib/home';

const { features, testimonials } = await getHomeData();
---

<BaseLayout title="Home">
  <HeroSection />
  <FeaturesGrid features={features} />
  <TestimonialsSlider testimonials={testimonials} />
  <CtaSection />
</BaseLayout>
```

## How to Split a Large Service

```typescript
// BAD: src/lib/blog.ts — 120 lines

// GOOD: Split by responsibility
// src/lib/blog/queries.ts    — database/API queries
// src/lib/blog/transforms.ts — data transformation
// src/lib/blog/index.ts      — public API re-exports
```

## Automated Check

```bash
# Check files exceeding the configured ceiling
find src -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \
  | xargs wc -l | awk -v max="${FUSE_SOLID_MAX_LINES:-200}" '$1 > max {print $0}' | grep -v total
```
