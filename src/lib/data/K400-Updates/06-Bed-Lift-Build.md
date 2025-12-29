#! title: 0.6 Building the Bed-Lift System
#! date: 12/29/2025
#! tags: K400, Laser Cutter, Bed Lift, Z Axis, Linear Rails, Timing Belt, Stepper Motor, ACME Rods, gearbox, Bed, focus, laser, axis, glue, splice, GT belt
#! description: Constructing the gantry system for the K400 Laser Cutter, including linear rails, timing belts, stepper motors, and laser optics.
#! author: Eli Bukoski
#! image: laser06/bedlift-finished.webp

# The Bed and Z Axis

One major pain with the previous laser cutter was the lack of an adjustable Z axis or, really, any sort of bed. Along the way, I upgraded the laser with a sheet of stamped honeycomb for a bed, which worked well. The holes in the honeycomb provide an area for smoke and flames from cutting to be removed by the air assist. Being a thin stamped sheet, the honeycomb is a lot thinner than what’s used on real laser cutters. Securing the sheet with screws provides tension, which makes the sheet flat enough to use. The screws stick above the bed surface, which isn’t ideal, but the variation is small enough that it’s negligible at least while doing engraving or light cutting.

I adopted the same bed design for this laser cutter, supporting the stamped sheet bed on an 8020 extrusion beam and joist frame. During the construction, the corner brackets I purchased had extra features made to align the channels in extrusion. I had to sand these off to use the brackets in this orientation.

#!g
![Pieces of the Bed Frame](/laser06/bed-frame-peices.webp){Pieces of the Bed Frame}
![Sanded Corner Bracket](/laser06/corner-bracket.webp){Sanded Corner Bracket}
![Half Assembled Bed Frame](/laser06/partial-bed-frame.webp){Half Assembled Bed Frame}
![Bed Assembled](/laser06/bed.webp){Frame with Stamped Honeycomb Bed}
#!g

## The Z Axis

The more important part of this upgrade is not the bed design, although it’s much bigger, but to make the bed itself move. For the Z-axis, or bed lift, I wanted to incorporate 8 inches of travel and reuse as much material from the Dimension printer here. The 0.5” linear rods and bearings were used. I printed housings for the linear bearings. While they fully function, supporting the bed from side to side forces, the tolerances were too loose for me to consider using them for any really critical motion systems. Plus, the contact points from the linear bearing carriage are made to contact steel. They would have tremendous backlash as the plastic crept over time. In retrospect, the linear rails were probably not even necessary. They have more slop than the bearings on the threaded rods, and functionally add nothing to the lift.

#!g
![Bed Lift Printed Brackets](/laser06/lead-screw-hardware.webp){Printed Brackets for Lead Screw and Linear Bearings}
![Linear Bearings and Housing](/laser06/linear-bearing-hardware.webp){Linear Bearings and Housing}
![Assembled Linear Carriage](/laser06/linear-bearings-assembled.webp){Assembled Linear Carriages}
#!g

Continuing from that, the bed lift functions via 0.375” ACME threaded rods, all driven from GT pulleys at the bottom of the subsystem. Because McMaster only sells 0.25” ID pulleys, I borrowed machine time at work to cut flats on the rods using a lathe. They weren’t pretty as I just hand-fed the machine, but they work. They are also actually concentric with the threads. I should have used this method on the Y axis of the gantry. The ACME rods are supported by thrust bearings at the top and standard ball bearings at the bottom.  
While uncommon, the bed is driven up and down by hex ACME bolts. They were cheaper than real lead-screw nuts, but probably have worse performance. However, the bed is always only loaded by gravity, so backlash isn’t a concern. It also helped that I took the same style nut and made a jam nut assembly at the top of the rod, transferring load to the thrust bearing.

#!g
![ACME Rods with Flats](/laser06/pulley-flats.webp){ACME Rods with Flats for GT Pulleys}
![Thrust Bearing Housing](/laser06/thrust-bearing-housings.webp){Thrust Bearing Housing at Top of ACME Rod}
![Thrust Bearing Stack](/laser06/thrust-bearing.webp){Thrust Bearing Stack}
![ACME Hardware](/laser06/lead-screw-all-hardware.webp){ACME Rods and Nuts Hardware}
![Hex ACME Nut](/laser06/hex-acme-nute.webp){Hex ACME Nut Used for Bed Lift}
![GT Pulleys on ACME Rods](/laser06/gt-pulley.webp){GT Pulleys Mounted on ACME Rods}
![Jam Nut Assembly](/laser06/loctite.webp){Jam Nut Assembly at Top of ACME Rod}
![Half of Bed Lift Assembled](/laser06/half-bedlift.webp){Half of Bed Lift Assembled}
#!g

## Driving the Z Axis

The next step in the bed-lift is the actuator, which will bring the axis to life. I’ve seen other diy lasers drive this axis with a hand-crank, which is nice for the simplicity. However, my goal, as mentioned in the gantry page, was to automate the focus process. This requires the machine to be able to actuate this system by itself. I attempted to use the Z-axis motor from the Dimension printer for this, replacing the gt-3 pulley on it with a gt-2 one. I simply could not find a supplier who sold GT-3 belts in lengths long enough to span the 12ft between all 5 pulleys. This motor ended up not having the torque necessary to drive the axis.

As an aside, I think I could have gotten this motor working with a low speed and graceful acceleration profile in the microcontroller, but I never got that far into the electronics when this change was made. I was just testing systems with a quick stepper driver and RC PWM generator. I swapped the NEMA-23 stepper motor for another NEMA-23, but with a 25:1 gearbox reduction on the end. This had more than enough torque to drive the bed up and down with a decent weight payload of 20lbs during testing.

The motor mount is the tensioning system for the belt. The t-nut bolts can be loosened, and the motor moved back, tightening the belt. This whole-mount assembly is actually attached to the back of the laser enclosure. It was designed fairly late in the design process, where the bedlift was actually the first subsystem designed.

#!g
![Bed Lift Motor And Tension Components](/laser06/bedlift-motor-assembly.webp){Bed Lift Motor And Tension Components}
![Bed Lift Motor Mount](/laser06/assembled-motor-assembly.webp){Bed Lift Motor Mount}
![Idler Pulley Assembly](/laser06/bell-crank-pulley.webp){Idler Pulley Assembly}
![Mounted Bed Lift Motor](/laser06/motor-ass-in-position.webp){Motor Assembly In Position}
#!g

## The Belt

As mentioned, I used roughly 12 feet of GT-2 6mm width belt for this axis. The travel of the ACME screws dictated that the belt would travel 50% of its length or more from limit to limit. As a result, I could not terminate this belt at a single point like the gantry axis. I needed a continuous loop of timing belt. No suppliers make a 3.8ft diameter belt loop (sold in circular diameter rather than tooth count or length for some reason). I had to splice one myself.

The method I used was to glue overlapping lengths. The start and end of the belt are thinned to 50% thickness, with one side losing its teeth. Then these thin segments are overlapped and glued together to form a continuous link. It’s important to use another section of the belt to align the remaining teeth on both ends so there is no discontinuity. A jig could also be 3d printed. It’s also really important to use flexible glue. The belt bends around pulleys, and in my case, quite aggressively around 0.75” diameter ones. A rigid glue will bend-fatigue during these bends, causing quick failure.

#!g
![Glue Test](/laser06/locktite-belt-test.webp){Belt Glue Test}
![Glue Test Winner](/laser06/locktite-test-win.webp){Glue Test Winner}
#!g

I performed a few practice splices and tested out different glues. I found that the Loctite 1597701 performed exceptionally well, outcompeting regular cyanoacrylate super glues and even a rubber shoe sole glue. For high-tensile systems, the internet suggests a rubber contact cement may be better, but this joint has now been held for 2+ years with no issue, albeit low usage.  
With all this in hand, I was ready to finish the bed-lift by splicing the belt together, joining the bed-lift to the motor system.

![Spliced Belt Installed](/laser06/bedlift-belt-in-place.webp){Spliced Belt Installed}
![Bed Lift Finished](/laser06/bedlift-finished.webp){Finished Bed Lift System}

![](/laser06/bed-lift.webm)
(Test Driving The Bed Motor)
