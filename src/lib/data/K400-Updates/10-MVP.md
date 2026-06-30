#! title: 1.0 - Minimum Viable Product
#! date: 6/29/2026
#! tags: K400, Laser Cutter, final, MVP, timeline, downloads, open source
#! description: The laser cutter project has reached a state of minimum viable product, and this article covers the final functionality, timeline, and open source files for the project.
#! author: Eli Bukoski
#! image: laser10/whole-laser.webp


# Minimum Viable Product

The term minimum viable product was coined in 2001 by Frank Robinson (according to Wikipedia), for a development style which releases the first functional version of the product to users, omitting quality of life features which may be added later. I personally dislike this strategy in its theoretical form. While mostly harmless in consumer software, the expansion of this ideology into other technology markets carries too significant a risk for me. If a phone app crashes or is buggy, no harm is done, but the same cannot be said in technology which has the capacity to injure, ie spaceflight, aviation, or a host of industrial machinery. However, it’s difficult to reconcile this stance with the fact that startups have limited resources. They may simply be unable to sustain the development cycle for a “more rigorous” design process. A buggy product will outperform one never released.

Regardless of these moral quandaries, the laser project needs to be designated as _finished_ sometime, and so I consider this state following the update to use a Ruida controller as the first time it’s functional enough to use for production. It’s definitely not perfect, and I want to continue to iterate on a custom motion controller, but especially the physical build is static.

## Final Functionality

As mentioned, the laser does not perform all functions as initially desired. The bed lift, or z axis, falls farthest from desired performance out of all the subsystems, but none are perfect. I’ve listed below some of the main performance goals I hoped for going into this project versus the current state.  
#% 1,2 

### Intended Functionality

- 24x48” cut volume  
- 600 mm/s raster  
- 40,000 mm/s^2 acceleration  
- 1000 dpi raster  
- Contactless auto-focus  
- Continuous focus compensation during operation  
- 12” Z depth  
- Direct K40 Whisperer & SVG dither support  
- Automatic peripheral control (air, exhaust)  
- 100% duty cycle operation (continuous runtime)  
- Safety interlock & E stop ability

![Laser Cutter CAD Assembly](laser10/whole-laser-design.webp)

#% 1,2

### Actual Functionality

- 22x45” cut volume  
- 400 mm/s raster  
- 2000 & 30,000 mm/s^2 acceleration (Y & X)  
- 1000 dpi raster  
- No Auto focus  
- 8” Z depth  
- No direct K40 Whisperer & SVG dither support  
- Automatic peripheral control (air, exhaust)  
- 100% duty cycle operation (continuous runtime)  
- Safety interlock & E stop ability

![Laser Cutter Build](laser10/whole-laser.webp)

#%

The build and integration articles cover in detail why many of this design goals weren’t achieved, mostly just due to inexperience on my part. However, next I do want to cover two aspects not included in the build log: timeline and open source files.

### Timeline

```mermaid
gantt
    title Laser Cutter Project Timeline
    dateFormat  YYYY-MM-DD
    section Design & Planning
    CAD Design V1: 2023-01-01, 2023-02-15
    CAD Design V2: 2023-02-16, 2023-07-15
    section Mechanical Build
    Base Frame Build: 2023-07-20, 2023-07-30
    Gantry Build: 2023-07-27, 2023-11-01
    Bed Lift Build: 2023-07-27, 2023-08-09
    Enclosure Build: 2023-08-15, 2024-01-07
    section Electronics & Control
    M2 Nano Electronics Panel: 2023-09-16, 2024-01-15
    Exhaust & Air Control: 2023-09-16, 2023-11-07
    Ruida Controller Upgrade: 2024-05-12, 2024-06-02
    section Testing & Iteration
    Initial Testing: 2024-01-07, 2024-06-02
```
Note I never cover the first CAD design, it was based on the motif of 3D printing monolithic multiple-function brackets, which I quickly realized was a poor design choice.

Also, the dates of article are publication dates, not the project timeline dates.

### Downloads

You can download the Inventor assembly (or OBJ) for the laser cutter build here:  
[Mech Downloads Page](/downloads/k400-mech)

I’ve also included the schematic files for wiring (of the M2 Nano setup) here:  
[Electronics Downloads Page](/downloads/k400-elec)

You can also get the code for the auxiliary micro-controller here:  
[Laser Aux- Github](https://github.com/Mapy542/Laser-Cutter-Auxiliary)

All files for the laser cutter project are free-open source, effectively MIT licensed, for any use open or not (I ask you avoid republishing, instead refer here). While the limitations of this design are well documented here, the mechanical build matches parody with the real build including some small changes documented during the integration article. The assembly designs may make a good jumping off point for you to refine if you choose to start here.

I look forward to continuing to iterate on the project, tackling the remaining issues and using it as a platform to develop a custom motion controller. I hope you’ve enjoyed reading about the project, and I look forward to hearing from you if you have any questions or comments.

![](/laser10/mvp-run-raster.webm)

Misc project images:
#!g
![Laser Build](laser-overview/far-oput-laser-in-laser.webp)
![2nd Mirror](laser10/2nd-mirror.webp) {Second mirror}
![40w Tube Mounted](laser10/40w-tube-mounted.webp) {40W tube mounted}
![40w Tube Mounts On Back Beam](laser10/40w-tube-mounts-on-back-beam.webp) {40W tube mounts on back beam}
![40w Tube Mount](laser10/40w-tube-mount.webp) {40W tube mount}
![80w Close Fit](laser10/80w-close-fit.webp) {80W close fit}
![80w Tube In Laser](laser10/80w-tube-in-laser.webp) {80W tube in laser}
![80w Tube Mount](laser10/80w-tube-mount.webp) {80W tube mount}
![80w Upgrade](laser10/80w-upgrade.webp) {80W tube next to 40W tube}
![All Subsystems Assembled](laser10/all-subsystems-assembled.webp) {All subsystems assembled}
![Attaching Back Frame Beam](laser10/attaching-back-frame-beam.webp) {Attaching back frame beam}
![Bad Idler Design](laser10/bad-idler-design.webp) {Bad idler design}
![Bed Frame](laser10/bed-frame.webp) {Bed frame}
![Bedlift Done2](laser10/bedlift-done2.webp) {Completed bed lift}
![Bed Motor Pulley](laser10/bed-motor-pulley.webp) {Bed motor pulley}
![Belt Installed](laser10/belt-installed.webp) {Belt installed}
![Big Dragchain](laser10/big-dragchain.webp) {Large drag chain}
![Broken Bell Crank Pulley](laser10/broken-bell-crank-pulley.webp) {Broken bell crank pulley}
![Chiller And Dog](laser10/chiller-and-dog.webp) {Chiller and dog}

![Corner Lead Screw](laser10/corner-lead-screw.webp) {Corner lead screw}
![Cutting Next Panels](laser10/cutting-next-panels.webp) {Cutting next panels}
![Dirty Electrical Cabinet](laser10/dirty-electrical-cabinet.webp) {Dirty electrical cabinet}
![Door Open Finished](laser10/door-open-finished.webp) {Finished door open view}
![Double Cut Linear Rail](laser10/double-cut-linear-rail.webp) {Double-cut linear rail}
![Dovetail Idler Base](laser10/dovetail-idler-base.webp) {Dovetail idler base}
![Drag Chain Wires](laser10/drag-chain-wires.webp) {Drag chain wires}
![Electronics Running](laser10/electronics-running.webp) {Electronics running}
![Em](laser10/em.webp)
![Enclosure Collision](laser10/enclosure-collision.webp) {Enclosure collision}
![End Stop](laser10/end-stop.webp) {End stop}
![Extrusion Inner Hole](laser10/extrusion-inner-hole.webp) {Extrusion inner hole}
![Fan2](laser10/fan2.webp)
![Finished Gusset 2](laser10/finished-gusset-2.webp)
![Finished Gusset 3](laser10/finished-gusset-3.webp)
![Finished Gusset](laser10/finished-gusset.webp) {Finished gusset}
![Finished Laser Head](laser10/finished-laser-head.webp) {Finished laser head}
![Flexible Silicone Tube](laser10/flexible-silicone-tube.webp) {Flexible silicone tube}
![Flow Sensor](laser10/flow-sensor.webp) {Flow sensor}
![Frame And Panel Integrated](laser10/frame-and-panel-integrated.webp) {Frame and panel integrated}
![Frame Build 3](laser10/frame-build-3.webp) {Frame build}
![Frame Half](laser10/frame-half.webp) {Frame half}
![Gantryback](laser10/Gantryback.webp) {Gantry back}
![Gantry Legs](laser10/gantry-legs.webp) {Gantry legs}
![Greased Lead Screw](laser10/greased-lead-screw.webp) {Greased lead screw}
![Gusset Expoxy Assembly](laser10/gusset-expoxy-assembly.webp) {Gusset epoxy assembly}
![Half Bedlift And Bed](laser10/half-bedlift-and-bed.webp) {Half bed lift and bed}
![Hammered Pulley Block](laser10/hammered-pulley-block.webp) {Hammered pulley block}
![Head Assembly](laser10/head-assembly.webp) {Head assembly}
![Heat Expansion Pulley](laser10/heat-expansion-pulley.webp) {Heat expansion pulley}
![Inside Bedlift Motor Assembly](laser10/inside-bedlift-motor-assembly.webp) {Inside bed lift motor assembly}
![Integrated Frames](laser10/integrated-frames.webp) {Integrated frames}
![Integration All Subsystems](laser10/integration-all-subsystems.webp) {Integration of all subsystems}
![Integration On Base](laser10/integration-on-base.webp) {Integration on base}
![Linear Rod On Bedlift](laser10/linear-rod-on-bedlift.webp) {Linear rod on bed lift}
![Mounted Door Panels](laser10/mounted-door-panels.webp) {Mounted door panels}
![Mounting Hole](laser10/mounting-hole.webp) {Mounting hole}
![Panel 2](laser10/panel-2.webp)
![Panel Mount Bracket](laser10/panel-mount-bracket.webp) {Panel mount bracket}
![Press Fit Pulley](laser10/press-fit-pulley.webp) {Press-fit pulley}
![Sides Mounted](laser10/sides-mounted.webp) {Sides mounted}
![Tof Sensor Placed](laser10/tof-sensor-placed.webp) {TOF sensor placed}
![Topdown Laser In Laser](laser10/topdown-laser-in-laser.webp) {Top-down view inside the laser}
![X Stepper Testing](laser10/x-stepper-testing.webp) {X-axis stepper testing}
![Y Axis Motor Mounted](laser10/y-axis-motor-mounted.webp) {Y-axis motor mounted}
![Y Drag Chain Wires](laser10/y-drag-chain-wires.webp) {Y-axis drag chain wires}
![Y Stepper Wired](laser10/y-stepper-wired.webp) {Y-axis stepper wired}
#!g

[Next: 1.1 Re-designing the contactless focus](/K400-Updates/)
[Previous: 0.9 Integration](/K400-Updates/09-Integration)
[Back to Homepage](/k400-home)
