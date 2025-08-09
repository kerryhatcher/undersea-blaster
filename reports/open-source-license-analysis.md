# Open Source License Analysis Report

Based on consultation with four legal advisors, here are three recommended licensing options for your underwater game project that prevent wholesale commercial copying while encouraging community remixing:

## Option 1: GNU Affero General Public License v3.0 (AGPL-3.0)
**Best for maximum protection of web-based games**

### Overview
The AGPL-3.0 is the strongest copyleft license, specifically designed for network-deployed software. It closes the "SaaS loophole" by requiring source code disclosure even when the software is accessed over a network (not just distributed).

### Pros
- **Strongest protection** against commercial exploitation
- **Network clause** ensures web-hosted modifications must share source
- **Full copyleft** requires all derivatives to use same license
- **Patent protection** included for contributors
- **Ideal for browser games** that run primarily online

### Cons
- **Most restrictive** may discourage some contributors
- **Corporate hesitation** due to strong requirements
- **Library compatibility** issues with some frameworks
- **Complexity** for newcomers to understand

---

## Option 2: GNU General Public License v3.0 (GPL-3.0) 
**Traditional strong copyleft protection**

### Overview
GPL-3.0 provides strong copyleft protection requiring any distributed modifications to be open-sourced under the same license. However, it doesn't cover network use as distribution.

### Pros
- **Strong copyleft** prevents proprietary forks
- **Well-established** with extensive legal precedent
- **Patent protection** for contributors
- **Wide recognition** in open source community
- **Forces contribution** back to community

### Cons
- **No network clause** - web hosting doesn't trigger requirements
- **Library restrictions** - incompatible with some licenses
- **Commercial barriers** - many companies avoid GPL
- **Distribution-only** - doesn't protect SaaS deployments

---

## Option 3: Dual Licensing Strategy (GPL/AGPL + CC BY-NC-SA)
**Comprehensive protection with flexibility**

### Overview
Use GPL-3.0 or AGPL-3.0 for code, combined with Creative Commons Attribution-NonCommercial-ShareAlike 4.0 for game assets (graphics, sounds). Optionally offer commercial licenses.

### Pros
- **Flexible approach** - different terms for code vs assets
- **Revenue option** - can sell commercial licenses
- **Community-friendly** - clear terms for contributors
- **Asset protection** - explicit non-commercial clause for art
- **Best of both** - code freedom with asset control

### Cons
- **More complex** - multiple licenses to manage
- **Documentation overhead** - requires clear explanation
- **Contributor confusion** - different rules for different files
- **Enforcement challenge** - monitoring multiple license types

---

## Recommendation

For your Undersea Blaster game, I recommend **Option 1: AGPL-3.0** as it provides:

1. Maximum protection for web-based deployment
2. Prevents wholesale commercial copying
3. Ensures improvements are shared back
4. Specifically designed for browser-based applications

Consider adding CC BY-NC-SA 4.0 for game assets if you create original artwork or sounds, creating a hybrid approach that maximizes both protection and community benefit.

## Implementation Steps

1. **Create LICENSE file** in project root with full AGPL-3.0 text
2. **Add license headers** to all source files
3. **Update package.json** with `"license": "AGPL-3.0"`
4. **Create LICENSES directory** if using dual licensing
5. **Update README.md** with clear licensing section
6. **Add CONTRIBUTING.md** to explain contribution terms

## Example License Header

```typescript
/**
 * Undersea Blaster
 * Copyright (C) 2025 Kerry Hatcher
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
```

## Additional Resources

- [AGPL-3.0 Full Text](https://www.gnu.org/licenses/agpl-3.0.html)
- [GPL-3.0 Full Text](https://www.gnu.org/licenses/gpl-3.0.html)
- [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- [Choose a License](https://choosealicense.com/licenses/)
- [SPDX License List](https://spdx.org/licenses/)