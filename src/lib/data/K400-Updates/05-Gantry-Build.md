#! title: 0.5 Building the Gantry System
#! date: 12/14/2025
#! tags: aluminum, extrusion, cutting, miter saw, laser cutter, build, construction, design, materials, preparation, assembly, bin, packing, algorithm, optimization, efficiency, laser, gantry, rails, linear motion, timing belt, stepper motor, idler pulley, drag chain, cable management, optics, laser tube, mirror, focusing lens, TOF sensor, VL6180x, automatic focusing, glass tube, CO2 laser
#! description: Constructing the gantry system for the K400 Laser Cutter, including linear rails, timing belts, stepper motors, and laser optics.
#! author: Eli Bukoski
#! image: laser05/finished-gantry.webp

# The Gantry Build

The gantry is the heart of the laser cutter, arguably the most important piece. It is the motion axis that directs the laser light down onto the cut. Its accuracy and speed determine the performance of the machine. Because of this, special care was taken when designing and with materials selection. The controlled motion of the gantry is defined by its linear rails, which constrain each axis down to a single degree of freedom that is parallel to the rail.  
I chose to overspec the linear rails as I was purchasing cheap and potentially unreliable ones from Amazon. They were incredibly cheap to have 1200mm of rail and 4 linear bearings for under $100. I assumed that using a small percentage of the rails' rated capacity would lead to a longer lifespan and potentially less play in the system. This did end up hampering the performance of the system due to the mass of the large bearing, which I discuss more.

[Here. 1.0 Minimum Viable Product](/K400-Updates/10-Minimum Viable-Product)

The rails are hardened steel, so they had to be cut to length with an abrasive chop saw, like the blade of an angle grinder. They could then be mounted to their respective frames to form the x and y gantry rails.

#!g
![Linear Rail Material](/laser05/linear-rail.webp){Linear Rail}
![Cut Linear Rail](/laser05/cut-linear-rail.webp){Cut Linear Rail}
![Y Axis Rail Mounted](/laser05/mounted-y-axis-rail.webp){Y Axis Rail Mounted}
![X Axis Rail Mounted](/laser05/x-axis-linear-rail.webp){X Axis Rail Mounted}
#!g

After the linear rails were mounted, the power transmission system could be assembled. The laser will use a timing belt system, much like a 3d printer. I chose the GT-3 system from Gates as I recovered a significant amount of hardware from the Dimension Printer. The cylindrical toothed belt system is known for its high power transmission ability as well as precision and zero slop. It was the belt system fitted on the Dimension printer, and it seemed like an obvious choice for a laser where speed and precision are key. The first added were idler pulleys for the y-axis. These were scavenged from the Dimension 3D printer mentioned in section 1. The y-axis has dual drive belts, but is only driven by one motor. An intermediary drive shaft transmits power from the motor to both drive belts. The shaft was assembled and mounted to the back frame section of the gantry.

#!g
![Y Axis Idler Pulleys](/laser05/y-axis-idlers.webp){Y Axis Idler Pulleys}
![Y Axis Drive Shaft](/laser05/y-axis-drive-shaft-mounted.webp){Y Axis Drive Shaft Mounted}
#!g

The process of assembly was quite a pain. I decided to bore out 5/16” pulleys to 1/2” to mount on the shaft, as the smaller pulleys were available easily via McMaster-Carr. I incorrectly assumed I could do this myself by hand on the drill press, thinking the drill bit would self-center. While the pulleys did work ok, they were very non-concentric to the shaft. This meant belt tension would vary throughout the travel of the gantry, leading to a lot of play in the y-axis, which I was trying to avoid with these belts. Ultimately, I had new pulleys re-bored on a lathe, and they work much better.  
The pulleys and bearings were press-fit onto the shaft, eliminating the need for retaining hardware. It also alleviates the issues caused by boring out all of the set-screw threads. This was a lucky coincidence, as I had not planned for a pres-fit on the shaft mounts. An oversized shaft was accidentally ordered (+0.005"). While this ended up being a fix for some issues, it did make assembly more difficult. A bearing was supposed to be placed in the middle of the shaft to minimize deflection over the 4 foot span, but the fit made this impossible with the tools I had available.

#!g
![Drilling Out Pulleys](/laser05/drill-pulley.webp){Drilling Out Pulleys}
![Backwards Mounted Bearing](/laser05/shaft-mounting-mistake.webp){Backwards Mounted Bearing}
![Removing Pressfit Bearing](/laser05/pull-off-bearing-mistake.webp){Removing Pressfit Bearing}
![Shaft Assembled](/laser05/y-axis-drive-shaft-mounted.webp){Shaft Assembled}
#!g

After pressing the shaft assembly together incorrectly the first time (bearing mounts weren’t oriented correctly), it could be mounted to the main back cross bar of the frame. It could be mounted to the sides, forming the finished gantry frame.

#!g
![Main Back Crossbar Cut 1" Short](/laser05/short-cut.webp){Main Back Crossbar Cut 1" Short}
![Gantry Frame Assembled](/laser05/partial-finished-gantry.webp){Gantry Frame Assembled}
![Y Axis Motor Mounted](/laser05/drive-end-y-axis-shaft-mount.webp){Y Axis Motor Belt GT3-9mm}
#!g

Next, the linear bearings were mounted on the rails, taking care not to lose any ball bearings. The x and y axes could then be mounted on top of the bearings via some custom aluminum plates I milled out. I did make the mistake of going too deep in the bolt counterbores, leaving just a flimsy cross-section of aluminum to support the x-axis. This caused it to want to tilt back and forth when the y-axis moved. I had to reinforce the joint by tapping an extra corner gusset into the plates and attaching it to the 2040 of the x-axis.

#!g
![Linear Bearings Mounted](/laser05/x-axis-mount-plate.webp){Linear Bearings Mounted}
![X Axis Carriage Mounted](/laser05/x-axis-bearing.webp){X Axis Carriage Mounted}
![X Axis Motor Mounted](/laser05/x-axis-motor-mounted.webp){X Axis Motor Mounted}
![X Axis Mount Mount 2](/laser05/x-axis-motor-mount-2.webp)
#!g

The Y axis also got positive stops to prevent the X axis from derailing its bearings.

#!g
![Y Axis Positive Stop](/laser05/end-stop-mounted.webp){Y Axis Positive Stop}
![Y Axis Squared off Positive Stop](/laser05/end-stop-alignment.webp){Y Axis Squared off Positive Stop}
#!g

Next, cable trays were cut from HDPE and fitted onto the gantry to support the cable chains. I made a custom 3d printed panel bracket to mount these, as none could be found commercially for an affordable price.

#!g
![Cable Tray HDPE Panel](/laser05/cable-trays-milled.webp){Cable Tray HDPE Panel}
![Cable Tray Bracket 3D Printed](/laser05/panel-mount-bracket_1.webp){Cable Tray Bracket 3D Printed}
![Cable Tray Mounted](/laser05/cable-tray-mounting.webp){Cable Tray Mounted on Y Axis}
![Cable Tray Mounted X Axis](/laser05/cable-tray-mount-x-axis.webp){Cable Tray Mounted on X Axis}
#!g

The cable chains, also known as drag chains, could then be fitted onto the gantry in preparation for wiring. I also pulled the required cables and 1/4” tubing through the chains.

#!g
![Laser Head Drag Chain Terminal](/laser05/head-drag-chain-mount.webp){Laser Head Drag Chain Terminal}
![X Axis Drag Chain Mounted](/laser05/x-drag-chain.webp){X Axis Drag Chain Mounted}
![Y Axis Drag Chain Mounted](/laser05/cable-management.webp){Y Axis Drag Chain Mounted}
#!g

For the x-axis, I had to build a custom idler pulley assembly, so this was printed and assembled. This first iteration had many glaring issues, primarily that I chose a belt pulley with an inner diameter of 1/4" but also specified a 5mm shaft and bearing set. I also realized there was no way to tension the x-axis. I had to redesign the idler to allow for this adjustment, via turning a bolt. The final iteration worked acceptably, with the idler pulley mounted in a dovetail carriage that was held in a base.

#!g
![X Axis Idler Initial Design](/laser05/x-axis-idler.webp){X Axis Idler Initial Design}
![X Axis Idler Redesign](/laser05/mounted-x-axis-idler.webp){X Axis Idler Redesign}
![X Axis Idler Tensioning](/laser05/tensioned-x-axis-idler.webp){X Axis Idler Tensioning}
#!g

In a similar vein, the X-axis belt clamp was also redesigned to be much better supported. It was clear that the first iteration was massively undersized for the forces required.  
![X Axis Belt Clamp Comparison](/laser05/beefed-x-axis-belt-termination.webp){X Axis Belt Clamp Comparison}

## Wiring & Bipolar Stepper Motor Configuration

Next was the wiring of the stepper motors. Throughout the design, I chose 4-conductor 20-awg cable. This is probably quite undersized to feed NEMA 23 stepper motors, but I haven’t had any issues so far. The motors recovered from the Dimension printer were 8-wire motors, meaning you could access each of the 4 individual coils. Stepper motors are meant to be driven in 2 phases, A and B, by bipolar stepper motor drivers (which are common), so some of the coils needed to be connected to produce A and B coil pairs. I mirrored the Dimension printer in connecting the coils in series.  
Notably, after doing some light research on the topic, a bipolar parallel setup allows for higher speeds because the motor inductance is lowered by roughly 4x. This allows the coils to accept more power at high frequency. It does come at the cost of higher motor current for a given output.

#!g
![Stepper Motor 8 Wire](/laser05/8-wire-stepper.webp){Stepper Motor 8 Wire}
![Chosen Series Wiring](/laser05/series-bipolar-connection.webp){Chosen Series Wiring}
![Wired X Axis Motor](/laser05/x-stepper-wired.webp){Wired X Axis Motor}
#!g

After hooking up the motors, the axis limit switches could be mounted. I chose to go with cheap micro-switches. They are set up to home the laser into the top left corner, closest to the laser output. Most of the cut work will happen near the laser origin, so if the optics alignment happens to be off, it won't be as noticeable there. The closer to the laser, the less path there is for the light to deviate from the target.

#!g
![X Axis Limit Switch](/laser05/x-home-limit.webp){X Axis Limit Switch}
![X Axis Limit Switch Triggered](/laser05/x-home-limit-hit.webp){X Axis Limit Switch Triggered}
![Y Axis Limit Switch](/laser05/y-home-limit.webp){Y Axis Limit Switch}
![Y Axis Limit Switch Triggered](/laser05/y-home-limit-hit.webp){Y Axis Limit Switch Triggered}
#!g

## Laser Optics & Tube Installation

At this point, the laser path optics could also be installed. There is a stationary mirror in the back of the laser, which directs light down the left side of the y-axis. Then, a mirror that moves with the Y axis bounces the light down the X axis to the head of the laser. I picked Cloudray mirror mounts to use here. The mirrors have to be finely aligned down to roughly +-0.002 rad, so rather than try to make my own alignment fixture, it seemed more time-effective to just purchase the mirror mounts. I do regret not making better mounting provisions for the mirrors. A single 20mm by corner gusset technically worked, but adjusting the placement of the mirror while keeping alignment was difficult. Plus, I did not leave enough room between the mirror and the enclosure. The far side of the mounting plate had to be cut off. Shown earlier, a final mirror directs the light downwards on the laser head and through a focusing lens.

![Laser Path Mirrors](/laser05/mirrors.webp){Laser Path Mirrors}

I also took the time to wire up a breakout board of a VL6180x TOF sensor. TOF stands for time of flight, a distance measurement methodology that operates like RADAR, but utilizes light at short ranges. This is the primary technology used in LiDAR systems, which often just spins a TOF system to get an area of ranging. The purpose of this sensor is to perform constantless and hands-free focusing. Since the laser only cuts well at the point where light impinges after the focusing lens, the workpiece needs to be within this focal plane underneath the laser head. This sensor will give a readout of the distance to the workpiece and allow a microcontroller to adjust the bed height. I hadn’t really seen this done on any commercial CO2 lasers, and I felt it was differentiating and a good research project. This type of automatic head leveling is common on metal laser cutters, but they use a capacitive proximity sensor, which only works with conductors.

The very last aspect of the gantry that needed to be assembled was actually the laser tube itself. Given my experience with glass tube CO2 lasers and their affordability, I chose to use a glass tube in this project. RF metal CO2 lasers offer longer lifespans and no need for coolant, but given this laser is not a full-time production machine and my budget first approach, the cheaper glass tube was the obvious choice.  
I originally planned to reuse the 40W tube from my old laser, but during December of 2023, while I was building this section of the laser, that tube gave up the ghost. It reached the end of its working life, and output power dropped to a small percentage of its original power. While finding replacement options, I wondered if an 80W laser tube would be compatible. I had originally designed the laser such that it _should_ fit an 80-watt laser, but hadn’t really verified this. Luckily, I found an 80W laser fit with a 1/16th” to spare. I decided to upgrade, and have been incredibly happy with this choice since it has saved hours of cut-time.  
The tube mounts were printed and attached to the back of the gantry frame. Then the tube was affixed, and power and coolant lines were run to it. Note there is a flow sensor on the return of the coolant so that the laser can detect any issues with the cooling system. This is critical because running the tube without a flow for even just seconds will degrade it; potentially even permanently destroying it due to thermal cracking.

## Integration Test & Issues

At this point, the bed-lift and enclosure frames had also been assembled, and it was time for sub-system integration. Here, I found a variety of frustrating clearance issues. The biggest offenders were the x-axis drag chain and the lead screws of the bedlift against the laser head.  
The tubing and cables within the drag chain had a much larger bed radius than I had allotted for. The chain would bow up and contact the enclosure. Certain gantry movements could pinch it between the gantry and enclosure, crashing the machine. I replaced the rigid polyethylene air line with a silicone one, which was much more flexible. I also removed the outermost jacket from the cables running within the drag chain. I learned the minimum bend radius is determined by the thickness of an object, so by taking the cables from 2 ¼” thick ones to 8 1/32” thick wires, they would bend much easier. This allowed the chain to hit the target 3” bend radius I allowed clearance for, but would cause issues later in the wiring.

![](/laser05/gantrymoving.webm){Gantry Moving Test}

With the gantry subsystem done, the following steps will be to build the enclosure and electrical systems for the laser; tying everything together.

[Next: 0.6 Building the Bed System](/K400-Updates/06-Bed-Lift-Build)
[Previous: 0.4 Aluminum Extrusion & Bin Packing](/K400-Updates/04-Aluminum-Extrusion)
[Back to Homepage](/k400-home)
