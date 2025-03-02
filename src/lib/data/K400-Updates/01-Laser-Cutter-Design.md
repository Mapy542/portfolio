#! title: 0.1 Laser Cutter Design
#! date: 12/10/2022
#! tags: CAD, FEA, Autodesk, Inventor, 3D Printing, DLP, SLA, Resin, FDM, Form2, Anycubic, Photon Mono X, 3D Printer, K40, Laser Cutter, Stratasys, Dimension SST 768, Nema 23, Linear Rods, Hotend, AC, DC, Power Supply, Linear Bearings, ACME, Lead Screws, Pulleys, GT3, GT2, Aluminum Extrusion, T-Slot, Honeycomb, Bed, Gantry, Rails, Monorail, Carriage, Drag Chain, Optics, Cloudray, Laser Head, Mirror Mount, Safety Factor, Creep, Young's Modulus, Deformation, Displacement, Strain, Isotropic, Von Mises Stress, Finite Element Analysis, FEA, Simulation, Safety Factor, Idler Pulley Bracket, Stepper Motor Driver, Nano M2
#! description: The start of the laser cutter project, reusing parts from a K40 laser cutter and a Stratasys Dimension SST 768 3D printer; combining them with 3D printed parts and aluminum extrusion to create a large format laser cutter. FEA of 3D printed parts too!
#! author: Eli Bukoski
#! image: laser01/Laser-Cutter.webp

# Reduce Reuse Recycle

The whole idea of this project was to reuse as many pieces of my current laser cutter: the K40 generic laser cutter and was inspired by the DIY laser cutter Layzor. I planned to harvest the laser tube, power supply, controller, mirrors, and lens which would make getting a new laser significantly more budget-friendly. In addition to this, I had an air pump as well as a water chiller I made from an old RV air conditioner that would be needed for a big laser.

#!g
![K40 setup](laser01/k40.webp){K40 Setup}
![Air assist pump](laser01/air-pump.webp){Air Assist Pump}
![AC turned water chiller](laser01/chiller.webp){AC Turned Water Chiller}
![Lens head with air assist](laser01/laser-head.webp){Lens Head with Air Assist}
![laser tube](laser01/co2-tube.webp){Laser Tube}
#!g

I felt it was fine to sacrifice cut time by reusing the less powerful hardware from the K40. I could later upgrade to more power if necessary. Most large-format laser cutters have an 80-watt or higher laser tube, but the one I have is only 40 watts. This means, on average, double the cut time, which can add up fast on a large bed. But for the price of $0, I am willing to try with the low power.

During the planning process, I had the chance to acquire an old industrial 3D printer. The Dimension SST 768 from Stratasys, to be exact. It is an impressive washing machine-sized tool, with some uncommon features. It used a whole heated chamber rather than a heated bed like most printers, and every axis was driven with powerful Nema 23 stepper motors on 1/2-inch linear rods. Some other design quirks included the dual hot-end that was such a massive chunk of metal that the printer had a dedicated 120-volt DC power supply to drive it. The supply was developed directly by Stratasys because using 120 volts of direct current is almost unheard of. But AC induces noise into nearby circuits, and it would disrupt the temperature sensors used in the hotend.

I never got the printer working, and support for the old device was non-existent. It felt like a shame to destroy such a unqiue and early industrial 3D printer, but it did take up a large amount of floor space as a 300 pound paperweight. I could reuse much of the motion system for the laser cutter and a 24, 12, and 5-volt power supply to drive all the electronics.

#!g
![Stratasys Dimension SST 768](laser01/sst768.webp){Stratasys Dimension SST 768}
![24V Power Supply](laser01/psu.webp){24V 10A Power Supply}
![Nema 23 Stepper Motor](laser01/stepper.webp){Nema 23 Stepper Motor}
![Linear Ball Bearing](laser01/lienar-rod-bearing.webp){Linear Ball Bearing}
![Box of harvested parts](laser01/all-parts.webp){Harvested Parts}
#!g

# Design Key Ideas

The goal of this laser cutter is to be as economical as much as possible, but not everything can come from recycling. The rest of the design will be built around the 20mm t-slot aluminum extrusion system. These rails can be easily cut to length, then brackets can attach anything to any point on the rails. This is great for customization, as well as changes because bolts are not locked to specific holes and locations.

For the parts that were a little too custom to be purchased, I turned to 3D printing. Specifically, DLP and SLA resin printing. With the Form2 and the Anycubic Photon Mono X, I could print custom parts in engineering resin that would hold up well to wear and stretch from continual loading. The parts that I will print will be the custom features like bearing pillow blocks with specific center locations.

I am designing this cutter in Autodesk Inventor, so the system of assemblies may seem a little odd. Sub-assemblies for each major component are constructed and then connected together in a master assembly. This allows them to separate sub-systems like the bed and gantry while leaving each one isolated. It uses extra material to support each individual system, but I hope this helps with large loads on the system. For instance, a heavy object on the bed shouldn’t deform the gantry as the two are not connected.

I also recovered GT3-style belts and pulleys. These are great for the gantry as the ball-like design minimizes any backlash. This is a slightly larger variant of the GT-2 belts commonly used in modern 3d printers.

#!g
![3D Printers](laser01/3d-printers.webp){3D Printers}
![Gantry System](laser01/Gantry-overview.webp){Gantry System}
![Bed System](laser01/Bed-Lift-Subsystem.webp){Bed System}
![GT Belt and Pulley](laser01/gt3-belt.webp){GT Belt and Pulley}
#!g

## Cut Volume

The k40 laser cutter is a generic design that is widely mass-produced in China. It comes by default with a 12 x 8-inch cut envelope, and you can fit something 4 inches tall inside of it, but it has no adjustable bed. This was extremely limiting to me since multiple products I sell have to be assembled from two 12 x 8-inch pieces.

The plywood I use comes in sheets of 2 x 4 feet, so this was the obvious maximum I wanted the cutter to handle because cutting material on the table saw is time-consuming and wasteful compared to a laser. I also hated the lack of an adjustable bed, and that the k40 had a maximum of 4 inches unless I cut out the bottom of the frame. I doubled this in the design to 8 inches of bed travel, and if need be, the bed can be removed to access another 2 inches.

Comparing the old laser cut volume of 12 x 8 x 4 = 384 cubic inches to the new 24*48*8 = 9216 cubic inches of cut volume. The new laser is exactly 24 times bigger.

## The Design

The whole structure is made from aluminum extrusion, with metric components. The bed subsystem consists of a honeycomb stamped steel sheet, as the bed, is supported on an extrusion joist frame. This whole bed assembly is supported horizontally with the recovered linear ball bearings, and vertically by ACME lead screws. Pulleys on each screw allow a belt to drive them synchronously from one stepper motor.

The gantry is a little bit more complicated, as it needs to withstand lots of repeat movements. The bed won't travel far, only moving up and down slightly to adjust level. The gantry will see miles of travel on each raster job. As for the structure, the gantry is a typical linear XY-axis system. As it stands now, the Y axis acts along the short side of the bed, and the X axis is on top of the Y axis. This means the X-axis must span the whole 4” length of the bed. It likely causes some excessive flexibility, but it does help with overall speed since the acceleration of the machine is fairly slow. The long axis means less accelerations per raster cut.

![Gantry up close](laser01/Gantryoptics.webp)

The axes themselves are linear rails, similar to that on the bed, but use a nonsymmetric rail. It's similar to the monorail trains you see in some public transportation. The carriage can only move forward and backward. This differs from the bed where the carriage also rolls on the symmetric cylinder rail. The extra constraint provided allows the X-axis to run as a monorail. This is, generally, worse than two rails as two provide more even support and don't apply nearly as much radial load to each carriage, but it was worth it in this case for the weight savings.

![Monorail train](laser01/monorail.webp){Monorail Train}

The Y axis is a double rail with one rail on each side of the bed. Because the long x-axis acts as a huge lever arm, it can’t be driven from only one side. It will cause it to flap around like a flag pole. To solve this, two belt drives are used, one on each side of the gantry. This does create some difficulty as they have to be driven exactly at the same time. The easiest way to do so is to link them to a single shaft that also spans the bed, behind the gantry. Then a stepper motor can drive the shaft, in turn driving both y-axis belts.

![FEA of the X-axis](laser01/fea-rail.webp){FEA of the X-axis for single point acceleration}

Finally, the gantry will need some extra features such as a drag chain for routing cables and optics mounts. For these, I used mainly off-the-shelf components such as the

[Cloudray Optics Mount (Leaving bukoski.dev)](https://www.cloudraylaser.com/products/cloudray-k-series-blue-laser-head-set-with-1st-mirror-mount-2nd-mirror-mount?variant=41503297110177&country=US&currency=USD&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic&gad_source=1&gclid=CjwKCAiAzPy8BhBoEiwAbnM9O4TJYipNd1o1gqQ9sui4zvDz3gj67nhmJE081an21fb4r2Q2k4z5aBoCmogQAvD_BwE)

Mirror mount. I felt, given the complexity of the parts, it was more cost-effective to just purchase rather than design.

### Aside about the Laser Tube Mount

Many laser cutters seem to subscribe to the idea that the laser tube should be incredibly securely mounted to the frame with an all encompassing band mount. This isn't necessarily bad, especially if the laser cutter is being shipped. However these mounts are expensive. I wanted to test printing my own much simpler mount. It would just hold the tube on axis by 2 v-block mounts. Admittedly, it is worse as the tube is supported by 4 contact points, which does create extra stress on the glass tube, but so far as static as the laser cutter is, this has not been a problem. The mount is also much cheaper to produce, and easier to install and remove the tube. The alignment of the tube is perfect since the two angled faces of each mount constrain the tube on-axis, although it is not adjustable.

One other potential downside found during testing, is that the rigid mount tranfers vibrations from frame to the laser tube. When empty of coolant, this causes the tube to resonate, which cannot be good. Hasn't caused any issues yet, but it is something to keep in mind.

![Laser Tube Mount](laser01/Gantryyaxis.webp){Early Laser Tube Mount visible in the bottom left.}

The laser cutter was designed twice up to this point. The first revision relied too heavily on complicated monolithic 3D printing brackets performing many functions. I scrapped that design and started over with the one shown now. However, it was important to make some quick tests of my 3D printed parts before building, using Finite Element Analysis.

# 3D Printing and Variations

Not all 3D printing is created equal, but most of it is cheap so that’s great.

In general, FDM printing is the hobbyist’s go-to standard. Plastic filament is extruded out through a nozzle to create a line of plastic. The lines are connected and stacked to form a 3-dimensional object. However, the lines and layers of lines aren’t always completely connected. This can result in weak points and rough surfaces in the prints. The plastic that makes up the prints is often optimized for looks rather than structural performance. The plastic will often deform over long times of physical stress, a quantifiable term known as creep.

DLP and SLA are the other common forms of hobbyist 3D printing. A vat of liquid resin is cured by ultraviolet light in the bottom forming a layer all at once. Then a platform pulls this layer up, and more resin flows underneath. Then this layer is cured to form another layer. Resin printing has distinct advantages compared to FDM like high resolution and accuracy. The resin being liquid means there are no lines and layers in the part, the part is equally strong in all directions. This is known as being an isotropic material. Furthermore, engineering resins, that are tough, rigid, or flexible can be used to get desired parts, and they often list the mechanical properties of the material. These include yield strength, Young’s modulus, and creep. Young’s modulus is very important in the laser cutter because it represents the ability to withstand deformation under load. The precise optics in the laser can’t drift over time, or while in movement which is affected by the modulus and creep.

# Finite Element Analysis

With the materials decided on, I could test each part to get an estimated maximum strength. Autodesk Inventor has a simulation tab where users can apply loads and test their designs. The main system that powers these simulations is Finite Element Analysis or FEA. It is the system where a complex solid is broken down into small elements and acted upon by forces. As an electrical engineer, I certainly am only scraping the surface of simulation, however, it is still a useful tool for determining failure points and estimating maximum load.

## FEA In Use

![FEA on a rectangular prism](laser01/fea-forces.webp)

This is all it takes to simulate force onto this rectangular prism. I applied a fixed constraint to the left face and applied a downward force of 50 pounds onto the right top edge.

Inventor will break up the solid into a mesh, and then calculate the force, stress, and deformation on it. Depending on the shape, calculation can take a lot of processing power and time.

#!g
![Von Mises Stress](laser01/fea-von-meiss.webp){Von Mises Stress}
![Safety Factor](laser01/safety-factor.webp){Safety Factor}
#!g

The simulation finishes and a variety of graphs are shown. The Von Mises Stress graph shows the severity of force within the prism. Areas closer to red have more stress and are consequently more important to the shape resisting deformation.

Another very important graph is the Safety Factor. This shows how many times over the simulated load is likely to break the part. The minimum on this part is a 7.25x safety factor. It can handle a 7.25 \* 50 lbs load, or approximately 360 pounds before failing. This is very dependent on the entered physical properties, and incorrect inputs can result in distortions. Another wild card to note is that the simulation may not include all real-world forces on a part. A quick example is, that a simulation may show the foundation of a building could support its weight easily, but if wind isn’t taken into account then that extra force may put it over the edge. It is very important to not rely on this if the breaking of a part can injure or kill a person. For reference, elevators are designed with a 10x or more safety factor, and general parts are designed to be 1.5 - 2.0x.

## Analyzing Actual Parts

Using the power of Inventors FEA, it’s time to see whether the laser cutter parts are strong enough for their applications.

You can check out the full analysis of the
[Idler Pulley Bracket](/Stress-Analysis-Report.pdf)

So what does this all mean? The first couple of images highlight the constraints and forces. The bolt holes are all held in place, mimicking bolts, and the axle hole has axial and bearing forces applied. This simulates belt tension in the bearing force and tests to ensure the bracket won’t fail if it’s pushed from the side as well.

The next area is the Von Mises Stress, it is a culmination of various stress and displacement factors, but essentially boils down to more stress means more critical to the part. Areas of high stress indicate critical parts of a design and may lead to failures if over-stressed.

Further down, the analysis highlights the displacement of the part. Even though we wish they weren’t everything is squishy to some extent, so the displacement is calculated to show how much a part would move under that force.

After that is the strain and safety factor, with the latter being the most important to us at this point. The analysis highlights that the part has a safety factor of 7.45 ul, meaning that it is 7 times stronger than the expected loading. This helps to ensure the part can handle unaccounted-for loads, plus resist creep in the long run.

## Other Parts

I won’t bore you with the analysis of every single 3D-printed part, but I did run simulations on them all. The most notable one was the bed ACME nut bracket that supported the bed from a threaded rod. The simulation shows the part was likely to shear if anything was dropped on the table making a force above 100 lbs. This force load may be reached more easily than you'd think. Inventor is only doing static analysis; drop impact can generate forces many times higher than the weight of the object, so out of precaution the main body of the bracket was thickened to support a static load of 100 lbs per bracket with some safety factor.

# Next Steps

After having designed and tested the gantry and bed systems, the laser cutter will need an enclosure.

[Next: 0.2 Laser Cutter Enclosure](/K400-Updates/02-Laser-Cutter-Enclosure)
[Back to the Updates](/k400-home)
