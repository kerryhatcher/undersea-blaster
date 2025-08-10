# AppImage Filename Versioning Best Practices

## Summary

Including the version (and architecture) in your AppImage filename is both **common** and **recommended**.
Example:

```
MyApp-1.0.2-x86_64.AppImage
```

## Why This Is Best Practice

* **Official Guidance**
  AppImage’s own recommendations use the format:

  ```
  AppName-<version>-<arch>.AppImage
  ```

  Example: `MyApp-1.0.2-x86_64.AppImage`.

* **Tooling Support**
  `appimagetool` supports `$VERSION` in filenames out-of-the-box if set as an environment variable.

* **Real-World Usage**
  Popular projects like Krita and Kdenlive distribute versioned AppImages:

  * `krita-5.2.6-x86_64.appimage`
  * `kdenlive-25.04.2-x86_64.AppImage`

* **User Benefits**

  * Enables side-by-side installs of multiple versions.
  * Makes it easier to reproduce and debug issues (“Which binary did I run?”).
  * Simplifies bug reports and support requests.

## Caveats

* **Desktop Entry Breakage**
  If users manually create launchers pointing to a specific filename, updating to a new version changes the path and can break those launchers.
  *Mitigation*: Recommend using AppImageLauncher or provide a stable symlink.

* **“Latest” Downloads**
  Versioned filenames make it harder to have a fixed download URL.
  *Mitigation*: Publish a second asset with a stable name (e.g., `MyApp-latest-x86_64.AppImage`) alongside the versioned one.

## Recommended Implementation

1. **Filename format**:

   ```
   MyApp-<version>-<arch>.AppImage
   ```

   Example: `MyApp-1.0.2-x86_64.AppImage`.

2. **Embed version & arch in metadata**:
   Use desktop entry keys:

   ```
   X-AppImage-Version=<version>
   X-AppImage-Arch=<arch>
   ```

3. **Provide “latest” asset**:
   On GitHub Releases, upload both:

   * `MyApp-1.0.2-x86_64.AppImage`
   * `MyApp-latest-x86_64.AppImage`

4. **Symlink or wrapper for stable path** (optional):
   Example:

   ```
   ln -s MyApp-1.0.2-x86_64.AppImage MyApp.AppImage
   ```
