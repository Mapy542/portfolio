# DynaImage Component - Data Flow and Architecture Analysis

## Overview

The DynaImage component is a sophisticated, responsive image loading system that dynamically serves optimally-sized images based on viewport dimensions, zoom levels, and device capabilities. It combines lazy loading, caching, and multi-resolution asset management.

## Component Architecture

### Core Dependencies

- **Vite's `import.meta.glob`**: Dynamic asset discovery and loading
- **Svelte's reactive system**: State management and re-renders
- **Intersection Observer API**: Lazy loading implementation
- **Visual Viewport API**: Zoom detection

### State Variables

```typescript
// Asset Management
let imageUrl: string | null = null; // Currently displayed image URL
let imageCache: Map<string, string>; // Global cache across instances
let pendingImageKey: string = ''; // Queued image to load

// Loading States
let isLoaded: boolean = false; // Image fully rendered
let isLoadingNewSize: boolean = false; // Transitioning between sizes
let loadingKey: string = ''; // Currently loading image key
let error: Error | null = null; // Loading error state

// Sizing and Responsiveness
let innerWidth: number = 0; // Window width (reactive)
let imgWidth: number = widths[0]; // Calculated display width
let zoomLevel: number = 1; // Detected zoom level
let devicePixelRatio: number = 1; // Device pixel density

// DOM References
let imgElement: HTMLImageElement; // Image element reference
let placeholderElement: HTMLDivElement; // Placeholder element reference
```

## Data Flow Timeline

### Phase 1: Component Initialization (0-50ms)

```
1. Component Creation
   ├── Props parsed (src, scaleFactor, paddingCount, etc.)
   ├── Global cache initialized (window.__dynaImageCache)
   ├── Reactive variables calculated (scaledFactor, paddingFactor, cssWidth)
   └── Initial render with CSS-calculated placeholder size

2. Initial Render
   ├── CSS calc() determines immediate placeholder size
   ├── Placeholder shown with 4:3 aspect ratio
   └── No JavaScript size calculation yet (fast initial render)
```

### Phase 2: JavaScript Initialization (50-200ms)

```
3. onMount() Execution
   ├── Window dimensions captured (innerWidth)
   ├── updateImageSize() calculates imgWidth
   ├── detectZoomLevel() determines initial zoom
   ├── Event listeners attached:
   │   ├── Resize handler (debounced 50ms)
   │   ├── Zoom detection (multiple methods)
   │   ├── Touch gesture tracking
   │   ├── Intersection Observer setup
   │   └── Periodic zoom checking (1000ms interval)
   └── DOM element observation begins
```

### Phase 3: Image Resolution Calculation (200-250ms)

```
4. Reactive Block Execution ($:)
   ├── Triggered by: src, imgWidth, zoomLevel, devicePixelRatio changes
   ├── getRequiredResolution() calculation:
   │   ├── displayWidth = imgWidth (from updateImageSize)
   │   ├── effectiveZoom = zoomLevel × devicePixelRatio
   │   ├── requiredWidth = ceil(displayWidth × effectiveZoom)
   │   └── findClosest(requiredWidth, thumbSizes) → resolution
   ├── Image key generation: `/src/lib/img/thumb/${resolution}/${src}`
   ├── pendingImageKey set for lazy loading
   └── Cache check → immediate load if cached
```

### Phase 4: Lazy Loading Decision (250ms+)

```
5. Intersection Observer
   ├── Observes placeholder/image element
   ├── Triggers when element enters viewport + 50px margin
   ├── Calls loadImage(pendingImageKey)
   └── Unobserves element after triggering
```

### Phase 5: Image Loading Process (250ms - 2s+)

```
6. loadImage() Function
   ├── Cache Check:
   │   ├── If cached → immediate display (isLoaded = true)
   │   └── If not cached → continue to network request
   ├── Loading State Management:
   │   ├── First load → isLoaded = false (show placeholder)
   │   └── Size change → isLoadingNewSize = true (keep old image)
   ├── Dynamic Import:
   │   ├── images[imageKey]() → Vite asset resolution
   │   ├── Module loading and URL extraction
   │   ├── Cache storage for future use
   │   └── imageUrl assignment
   └── Error Handling → error state display
```

### Phase 6: Image Rendering (2s+ - depends on network)

```
7. Image Display
   ├── Browser processes <img src={imageUrl}>
   ├── Network request for actual image file
   ├── Image download and decode
   ├── img.onload event fires
   ├── isLoaded = true → placeholder hidden
   └── Transition animation completes
```

## Size Calculation Logic

### Display Width Calculation

```javascript
// CSS (immediate)
cssWidth = clamp(90px, calc(min(100vw, 70vw) * scaleFactor * paddingFactor), 1500px)

// JavaScript (after onMount)
displayWidth = innerWidthScale(innerWidth) * scaleFactor * paddingFactor
where:
  innerWidthScale(width) = width < 768 ? width : width * 0.7
  paddingFactor = 0.75 - (2^paddingCount * 0.05)
```

### Resolution Selection Algorithm

```javascript
effectiveZoom = zoomLevel * devicePixelRatio;
requiredWidth = ceil(displayWidth * effectiveZoom);
selectedSize = findClosest(requiredWidth, [150, 225, 320, 480, 640, 960, 1280, 1920, 2560]);
```

## Zoom Detection Methods (Priority Order)

### Method 1: Visual Viewport (Mobile)

```javascript
zoomLevel = window.outerWidth / window.visualViewport.width;
// Best for: Mobile Safari/Chrome pinch zoom
// Threshold: Only if > 1.02 to avoid noise
```

### Method 2: Window Comparison (Desktop)

```javascript
zoomLevel = window.outerWidth / window.innerWidth;
// Best for: Desktop browser zoom
// Range check: 1.02 < zoom < 10
```

### Method 3: Device Pixel Ratio Changes

```javascript
zoomLevel = devicePixelRatio / initialDevicePixelRatio;
// Best for: Ctrl+scroll zoom detection
// Baseline stored in window.__initialDPR
```

### Method 4: CSS Test Element (Fallback)

```javascript
// Creates 100vw test div, compares to window.innerWidth
zoomLevel = 1 / (testDiv.offsetWidth / window.innerWidth);
// Fallback for browsers that don't support other methods
```

## Caching Strategy

### Global Cache Structure

```javascript
window.__dynaImageCache = Map<string, string>
// Key: "/src/lib/img/thumb/640/image.webp"
// Value: "/_app/immutable/assets/image.hash.webp"
```

### Cache Behavior

- **Shared across all DynaImage instances** on the page
- **Persistent during session** (lost on page refresh)
- **Instant loading** for cached resolutions
- **Size-specific caching** (different zoom levels cached separately)

## Event Handling

### Resize Events (Debounced 50ms)

```
Window Resize → handleResize() → updateImageSize() + detectZoomLevel()
```

### Zoom Events (Debounced 150ms)

```
- visualViewport.resize (mobile pinch)
- wheel + ctrl/meta (desktop zoom)
- touchmove (pinch gesture distance)
- orientationchange
- Periodic check (1000ms interval)
```

### Loading Events

```
Intersection → loadImage() → img.onload → isLoaded = true
```

## Performance Characteristics

### Strengths

1. **Fast Initial Render**: CSS calc() provides immediate sizing
2. **Efficient Lazy Loading**: Only loads when needed
3. **Smart Caching**: Prevents re-downloads
4. **Zoom Responsiveness**: Serves crisp images at any zoom level
5. **Network Optimization**: Serves appropriate resolution for context

### Identified Inefficiencies

#### 1. Redundant Event Listeners

```javascript
// INEFFICIENCY: Too many event listeners per component
window.addEventListener('resize', handleResize);
window.visualViewport?.addEventListener('resize', handleZoomChange);
window.addEventListener('wheel', zoomHandler);
window.addEventListener('touchstart', touchHandler);
window.addEventListener('touchmove', touchHandler);
window.addEventListener('orientationchange', handleZoomChange);
```

**Impact**: With many DynaImage instances, this creates listener pollution
**Solution**: Global event delegation or shared event manager

#### 2. Polling-Based Element Observation

```javascript
// INEFFICIENCY: Polling every 100ms for DOM elements
const observeInterval = setInterval(observeElement, 100);
```

**Impact**: Unnecessary CPU usage
**Solution**: Use MutationObserver or reactive element tracking

#### 3. Periodic Zoom Detection

```javascript
// INEFFICIENCY: Checking zoom every second regardless of need
const zoomCheckInterval = setInterval(handleImmediateZoom, 1000);
```

**Impact**: Constant background processing
**Solution**: Event-driven zoom detection only

#### 4. CSS Test Element Creation

```javascript
// INEFFICIENCY: DOM manipulation for zoom detection
const testDiv = document.createElement('div');
document.body.appendChild(testDiv);
// ... measure ...
document.body.removeChild(testDiv);
```

**Impact**: DOM thrashing on zoom detection
**Solution**: Cache test element or use alternative method

#### 5. Multiple Thumbnail Size Arrays

```javascript
// INEFFICIENCY: Two similar arrays maintained separately
const widths = [90, 95, 100, 125, ...];        // Display widths
const thumbSizes = [150, 225, 320, 480, ...];  // Available sizes
```

**Impact**: Potential synchronization issues
**Solution**: Single source of truth with derived arrays

#### 6. Reactive Block Over-Triggering

```javascript
$: {
	// INEFFICIENCY: Triggers on ANY reactive variable change
	const currentZoom = zoomLevel; // Forces reactivity
	const currentDPR = devicePixelRatio;
	// ... calculation ...
}
```

**Impact**: Unnecessary recalculations
**Solution**: More granular reactive statements

#### 7. Missing Debouncing on Image Loading

```javascript
// INEFFICIENCY: No debouncing on rapid size changes
// Could trigger multiple simultaneous requests
```

**Impact**: Network request waste during rapid resize
**Solution**: Debounce image loading requests

## Optimization Recommendations

### 1. Global Event Manager

```javascript
// Centralized event handling for all DynaImage instances
class DynaImageEventManager {
	static instances = new Set();
	static initialized = false;

	static register(instance) {
		this.instances.add(instance);
		if (!this.initialized) this.initializeEvents();
	}

	static notifyZoomChange() {
		this.instances.forEach((instance) => instance.handleZoomChange());
	}
}
```

### 2. Request Debouncing

```javascript
function debouncedImageLoad(imageKey: string, delay = 100) {
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => loadImage(imageKey), delay);
}
```

### 3. Unified Size Configuration

```javascript
const SIZES = {
	thumbnails: [150, 225, 320, 480, 640, 960, 1280, 1920, 2560],
	get displayTargets() {
		// Derive display targets from thumbnail sizes
		return this.thumbnails.flatMap((size) => [size * 0.6, size * 0.8, size]);
	}
};
```

### 4. Granular Reactivity

```javascript
// Split reactive blocks by concern
$: imageKey = deriveImageKey(src, imgWidth, zoomLevel, devicePixelRatio);
$: if (imageKey !== pendingImageKey) updatePendingImage(imageKey);
$: displaySize = calculateDisplaySize(innerWidth, scaleFactor, paddingCount);
```

## Browser Compatibility

### Supported Features

- **Intersection Observer**: 95%+ browser support
- **Visual Viewport API**: 85%+ (with fallbacks)
- **CSS calc()**: 99%+ browser support
- **Dynamic imports**: Modern browsers only

### Fallback Strategies

- Zoom detection has 4 fallback methods
- CSS sizing works without JavaScript
- Graceful degradation for older browsers

## Memory Usage

### Per Component Instance

- ~2KB state variables
- ~1KB event listeners
- Shared cache (global)
- DOM element references

### Scaling Considerations

- Linear memory growth with component count
- Shared cache reduces overall memory impact
- Event listener cleanup prevents leaks

This architecture provides a robust, performant image loading system with room for optimization in event handling and resource management.
