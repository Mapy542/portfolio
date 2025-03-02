#! title: 0.2 Laser Cutter Enclosure Design
#! date: 6/20/2023
#! tags: laser, enclosure, safety, design, electronics, cabinet, doors
#! description: Final design step of the K400 laser, creating a safe enclosure and electronics cabinet.
#! author: Eli Bukoski
#! image: laser02/enclosure-overview.webp

# The Enclosure

**Containing the laser is critical.**

The final design aspect of the laser cutter is to create an enclosure for the mechanisms, laser optics, and electronics. This step is often overlooked by cheap, hobbyist laser cutters, particularly the ultra-cheap diode ones, as the enclosure can seem non-mandatory, however it is a critical safety feature that cannot be overlooked

![Enclosure Overview](laser02/enclosure-overview.webp)

A typical CO2 laser tube produces light at a 10.6-micrometer wavelength. This is classified as infrared light and is invisible to humans. Furthermore, the tube power of 40W ranks the laser as a class 4 laser, this is the highest laser danger class. This classification means the laser can cause instant blindness, burns, and other damage. It’s also not just the beam itself that is dangerous, but any reflections cast from even off matte/diffuse material have these dangerous properties. The laser enclosure is an important part of the laser that keeps the light inside and away from anyone.

To increase the safety level of the cutter, any openings such as doors should be equipped with an automatic laser disable switch. That way opening the door does not leak laser light, just like how a microwave door stops the oven.

![Laser Tube](laser01/co2-tube.webp)

It’s also worth mentioning that a laser cutter is a moving machine. It has many pinch points and moving features that could catch and damage limbs. The enclosure further protects the laser and people from damage by keeping everything out of the way of the gantry and bed lift.

![Gantry](laser01/Gantry-overview.webp){Axis of Motion}

## Designing the Enclosure

The shell of the K400 laser cutter will be built in the same style as the rest of the machine. It uses a 2020 aluminum extrusion frame to support panels of acrylic and plywood to form a complete shell.

![Shell](laser02/enclosure-overview.webp){Brown is plywood, clear is acrylic}

The shell does not need to be nearly as rigid as the gantry because any deflection is isolated from the internal mechanisms. The enclosure is an entirely isolated sub-assembly from the rest of the laser cutter, following the isolationist motif present in the rest of the design. Plus, the plywood and acrylic panels act as shear walls when assembled, increasing the strength of the enclosure. This means 2020 square extrusion will be sufficient for every span, even though some reach up to 3ft. However, on a couple of sections, I chose to use 2040 extrusion because it leaves two rows of slots for securing screws on the panels. It is more effective to use two rows of extrusion slots, rather than interleaving tabs onto the panels. I did try the tab system on 2 of the smaller panels, but tolerances between the tabs and overall strength left a lot to be desired.

![Double Wide Extrusion](laser02/double-wide-extrusion.webp){Double Wide Extrusion}

During the layout of the panels, some different shapes were chosen to improve the layout efficiency as they were cut. The laser cutter is big enough to cut panels as big as 48″ x 24″, but it is not efficient to have an odd-shaped panel that is the entire size of the cutting area. Making smaller rectangular panels means that they may be packed more efficiently into the stock material.

![Smaller Panel with tabs](laser02/small-tab-panel.webp){Smaller Panel with tabs}

Using this design guide, the panels for all of the laser cutter come out to 10 sheets of material, with 8 of those being plywood for the body and 3 of acrylic for the door and top.

## Electronics Cabinet

From the laser tube power supply to the controller and stepper drivers, the laser cutter has a variety of electronic circuits and needs a place for them. The shell sections off a portion of the laser cutter to form an electronics cabinet. The top of the cabinet can be used for human-machine interface, ie the buttons and knobs.

![Electronics Cabinet](laser02/electronics-top.webp){Electronics Cabinet Top}

As the electronics heat the cabinet, some ventilation is required. The laser pulls air in the bottom of the electronics cabinet, and then out the top. Plus it repurposes this air by blowing it over the cutting area to evacuate smoke. Then only a single exhaust fan is needed for the laser to remove smoke and cool electronics. Win-Win.

![Exhaust Passthrough](laser02/exhaust-passthrough.webp){Exhaust Passthrough}

## Doors

The laser cutter has two doors on it, the main door to the bed of the laser cutter, and a side door to access the electronics cabinet. Each door is attached with two hinges that were sourced from Tnuts.com to be compatible with aluminum extrusion.

![Hinge](laser02/hinges.webp){Hinge}

The doors are very different sizes, but both have the same hinge used. Down the road, the bed hinge may need to be upgraded if the joint is too weak or wobbly, especially if lift assist gas springs are added.

## Next Steps

With the design done and qualified, it’s time to start assembly of the laser cutter. The first step is to build the base everything resides on.

[Next: 0.3 Laser Cutter Base Build](/K400-Updates/03-Base-Build)
[Previous: 0.1 Laser Cutter Design](/K400-Updates/01-Laser-Cutter-Design)
[Back to Homepage](/k40-home)
