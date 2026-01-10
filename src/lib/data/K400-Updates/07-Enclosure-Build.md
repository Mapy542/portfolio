#! title: 0.7 Building the Enclosure
#! date: 1/8/2026
#! tags: K400, Laser Cutter, Enclosure, Frame, Acrylic, Wood, Ventilation, Exhaust, Airflow, Safety, Optics, Electronics Cabinet
#! description: Constructing the enclosure for the K400 Laser Cutter, including frame assembly, panel cutting, and ventilation system setup.
#! author: Eli Bukoski
#! image: laser07/finished-2.webp

# The Enclosure Build

The last major physical component left to build is the enclosure of the laser. It starts with a 2020 frame. Specifically, the enclosure is built to be mechanically isolated from the rest of the laser. This means the enclosure frame can be a bit weaker without sacrificing cut performance. However, the enclosure has the benefit of being the only subsystem with shear walls, helping to strengthen it against frame bending. This is where the enclosure build runs into a dead-end. The panels were designed to be cut on a laser cutter, and this cutter is the only one I will have the capacity to manufacture.

#!g
![First Pieces of Enclosure Frame Assembled](/laser07/frame-build-minimal.webp){First Pieces of Enclosure Frame Assembled}
![Partially Assembled Enclosure Frame](/laser07/frame-build-2.webp){Partially Assembled Enclosure Frame}
![Enclosure Frame Assembled](/laser07/frame-done.webp){Enclosure Frame Assembled}
#!g

To finish the enclosure, the rest of the laser needs to be set up. A key part of laser cutting is turning the stock material into smoke, so serious ventilation is needed. I’m using a furnace blower, reclaimed from the return air section of the AC I turned into a water chiller for laser cutting. It’s not perfect, as its static pressure is low, leading to low flow, but the design of the motor to circulate air means it should have no issue running for long periods of time.
[Water Chiller Post](/Personal-Projects/ChillerHighlight)
The ventilation fan pulls exhaust out of the bottom left side of the laser. It is then pressurised by the blower, and enters a manifold so exhaust can be sent out the left or back of the laser. I’m currently sending it out the left side, up, and out a window.

#!g
![Hole In Base for Exhaust](/laser07/exhaust-hole.webp){Hole In Base for Exhaust}
![Bulkhead Fitting for Exhaust](/laser07/exhuast-port.webp){Bulkhead Fitting for Exhaust}
![Exhaust Fan](/laser07/vent-fan.webp){Exhaust Fan Reclaimed from AC Unit}
![Exhaust Manifold](/laser07/exhaust-manifold.webp){Exhaust Manifold with multiple outlets}
#!g

### Back to the Future

Following the assembly, integration, and light testing of the electronics, it was time to finish the enclosure by cutting the panels. You can see the electronics in the next post.

I started by cutting the electronics cabinet top out of grey acrylic. It also includes all control inputs. It cut quite well, except for the calibration of the controller, making it 0.25” too big in both directions. Why I started with the one stock material, which I could not easily replace, I don’t know. Thankfully, tweaking the enclosure frame a little out of square on the electronics end to fit the panel wasn’t catastrophic; thanks to it being isolated.

Following this, I was able to calibrate the machine correctly and finish cutting out most of the panels. The top of the laser is largely acrylic, with the sides being wood. A baffle panel is also cut, separating the electronics from the cutting volume of the laser. It has slits at its top, allowing air to flow from the electronics cabinet into the cutting volume and over the top of the workpiece. This clears the smoke out of the optics of the gantry and promotes pushing smoke down to the exhaust at the bottom. Plus, the door of the electronics cabinet has the same air intake as the baffle, but on its bottom. This promotes the exhaust system to not only clear the cutting volume, but also ventilate and cool the electronics. Furthermore, the air path into and up through the electronics cabinet is what’s known as optically opaque. There is no line of sight between the laser and the outside. This significantly reduces the chance of dangerously bright infrared light being emitted through the vents. This is a significant problem with the standard K40 laser design.

#!g
![Electronics Panel](/laser07/elextronics-panel.webp){Electronics Panel Cut from Grey Acrylic}
![Baffle Panel](/laser07/baffle.webp){Baffle Panel Cut and Stained}
![Baffle Installed](/laser07/electronics-mounted.webp){Baffle Installed in Enclosure, behind electronics panel}
![Other Acrylic Panels](/laser07/top-acrylic.webp){Other Acrylic Panels Cut for Enclosure}
![Other Wooden Panels](/laser07/panels-coated.webp){Other Wooden Panels Cut for Enclosure}
![Intermediate HMI Buttons](/laser07/electronic-switches.webp){Intermediate HMI Buttons Mounted in Electronics Panel}
#!g

The very last portion of the enclosure to be made was the top covers for the cutting volume door. I chose to make these out of clear acrylic so that it was easy to see the cut progress. These are completely safe from a laser light perspective, as acrylic is completely opaque to the 10.6 μm wavelength light coming from the laser. The clear doors block 100% of any potential laser light, but as is obvious, they allow visible light to pass. This turns out to be a bit of an issue, where the cutting of materials like wood in the laser emits such bright visible light that it’s dangerous itself, like staring at the sun. A better design would be to use the grey-tinted acrylic for all windows, as it would darken the bright light. I may be able to tint the windows in the future.

Unfortunately, the door must accept a 48” workpiece passing through it, and so it is bigger than this. I hoped that since the smallest dimension of the door panels was 25”, I could cut them while hanging off the laser. However, during integration as discussed, inadvertent collisions mean the cutting envelope is limited to 23” on its smallest. I had to manually cut these panels out, notch areas for the hinges to mount, and drill all screw holes. They were then mounted to the door, with most of the screw holes aligning, to finish the enclosure.

#!g
![Acrylic Ready to Cut on Sawhorses](/laser07/door-acrylic.webp){Acrylic Ready to Cut on Sawhorses}
![Acrylic Door Panel Cut in Half](/laser07/door-cut-half.webp){Acrylic Door Panel Cut in Half}
![Acrylic Door Panels Notched](/laser07/finished-door-panel.webp){Acrylic Door Panels Notched for Hinges}
![Acrylic Door Panels Mounted](/laser07/mounting-door-panel.webp){Acrylic Door Panels Mounted on Enclosure Door}
![Finished Enclosure Door](/laser07/finished-enclosure.webp){Finished Enclosure Door with Acrylic Panels}
#!g

### Back to the Past

With the enclosure built, all three subsystems can be integrated and mounted in their final places on the base. As discussed in the next post, electronics can be built and integrated too, combining each separate subsystem into a fully functional machine.

![The Finished K400 Laser Cutter](/laser07/finished-enclosure.webp){The Finished K400 Laser Cutter}

![](/laser07/raster-test.webm){Raster Test Cut on Finished K400 Laser Cutter}
_Preliminary Raster Cut on Finished K400 Laser Cutter_

[Next: 0.8 Electronics and Controller](/K400-Updates/08-Electronics-Controller)
[Previous: 0.6 Bed Lift Build](/K400-Updates/06-Bed-Lift-Build)
[Back to Homepage](/k400-home)
