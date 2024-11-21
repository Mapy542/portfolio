#! title: Dust Collector Design Guide
#! date: 05/15/2023
#! tags: woodworking, dust-collection, DIY, dust-control, thein-baffle
#! description: A guide to designing and building a dust collection system for a wood shop.
#! author: Eli Bukoski
#! image: dust-separator/thein-baffle.webp

# Dust Collector Design Guide

Dust is a commonly overlooked health issue, both in the home shop and in general industry. It can cause respiratory issues, and even be explosive in the right conditions (see CSB link below). A dust collection system is a must for any wood shop, and this guide will help you design and build one. Design templates are included for making the thein baffle separator:

#% 1,2

## Resources

[Tangential Pipe Joint [svg]](/Pipe-Tangential-Joint-Layout.svg)
[Thein Baffle Wall Template [zip]](/Polycarbonate-Template.zip)

#% 1,2

## References

[CSB Combustible Dust](https://www.csb.gov/recommendations/mostwanted/combustibledust/)
#%

# The Collection System

## Pipe Design Theories

There are two design strategies for a dust collection system, based on the number of expected concurrent users. If a system is designed for a single woodworker, all tools may be connected to a single-sized tube system. Then blast gates section off unused portions of the tube so that only the active tool is connected to the collector. For large-scale systems with many concurrent users, each tool is connected to a pipe of increasing diameter so that the total flow through the trunk line allows each tool to be used simultaneously.

For hobbyist woodworking, there is no sense in collecting dust from all tools simultaneously since you can only ever use 1 at a time. Plus, your dust collector must be rated to pull enough air to saturate the biggest pipe in the system. If your shop has 5 tools each with a 4-inch port, then the trunk line would have to be 30” in diameter. You would also need a dust collector with a 30-inch inlet.

The reason the dust collector must be sized along with the biggest pipe in the network is that the pipe network needs to self-clean. This occurs when the flow in a pipe creates enough force so that chips cannot settle and build up within the pipe. This will cause a restriction like a clogged artery. It can also limit the airflow at the tool leading to subpar dust collection in general.

![4" PVC Pipe Layout](dust-piping/overhead-tablesaw.webp)

## Choosing piping

Woodworkers use a couple of systems, and their prices vary widely: flexible 2″ hose, rigid PVC pipe, or metal ducting.

The two-inch hose is very convenient as it can bend around obstacles and doesn’t require fittings. However, the corrugated pipe is restrictive, so it requires a high-pressure and loud shop vac to pull air through. In addition, most woodworking tools require more airflow than a shop vac can provide, so some dust may be missed. The general 2″ shop vac tube is very affordable though.

The PVC pipe is the next tier up, it costs more than the tubing, and the rigid pipe requires elbows and tees and such, but it allows much more airflow and is not restrictive. This pipe can be sourced at nearly all home improvement stores in 10-foot sections along with fittings. Sewer and drain pipe is cheaper than the standard schedule 40 pipe that is used in house plumbing because of the thinner walls, but it’s plenty strong for dust collection purposes. However, the larger pipe means that it has a higher self-cleaning airflow requirement. A large consumer or professional dust collector is required to pull enough air through the pipe. As one final thought, the plastic pipes can build up static which can theoretically combust dust inside the pipe. This is recorded to be nearly impossible to actualize, but adding a grounding wire that extends into the piping system at various points should remove any static build-up.

Professional metal ducting comes in sizes varying from 4″ up to multiple feet in diameter. It’s expensive but easy to set up, and modify, and has all the advantages of PVC pipe, plus the conductive pipe doesn’t build up static. However, it’s out of the price range of most hobbyists.

In general, a 4” PVC pipe is a great middle ground between price and effectiveness for hobbyists. Because that system needs blast gates to cordon off sections at a time, I built my own. You can read about that:
[DIY Blast Gates](/Dust-Collection/Blast-Gates)

#!g
![Shop Vac Hose](dust-piping/shop-vac-hose.webp){Shop Vac Hose Credit to Wikimedia Commons: https://upload.wikimedia.org/wikipedia/commons/a/a8/Craftsman_16_Gallon_Wet-Dry_Vac.jpg}
![PVC Pipe](dust-piping/planer-connection.webp){PVC Pipe}
![Metal Ducting](dust-piping/metal-pipe.webp){Metal Ducting Credit to Wikimedia Commons: https://upload.wikimedia.org/wikipedia/commons/b/bf/Z_blade_extrusion-kneader.jpg}
#!g

# Dust Collector

Dust is picked up at the tool, pulled through piping, and needs to be separated from the air. This is the main job of the dust collector, in addition to drawing the air in. Dust collectors range in price and performance like tubing. It can range from a $20 shop vac to a 5 figure industrial separator. Each dust collector has a different size inlet to match its airflow. A shop-vac with a two-inch inlet works best with a 2″ pipe. It ensures the pipe maintains a self-cleaning airflow, but that the dust collector isn’t starved for air and can work effectively.

Keeping with the budget but powerful theme of 4″ PVC piping, the 2 HP Dust collector offered by Harbor Freight is an amazing deal for the price. It has a sealed 120-volt, 2-horsepower motor and a blower that can pull around 700-1000 cubic feet per minute of air. The filter system is a bit lacking, but that part is easy to upgrade.

![Sealed Motor](dust-separator/sealed-motor.webp){Sealed Motor}

## Cyclonic Dust Separation

Cyclonic dust separation, also known as cyclone dust collection, is a method used to separate dust particles from the air stream. It relies on the principles of centrifugal force and inertia to achieve the separation.

Air is pulled into a cylindrical or conic well tangent to the wall surface. Cleaned air is pulled out at the top center of the enclosed area. All the air enters it is forced to spin creating centrifugal force within the dust. This forces the dust along the walls of the separator, and gravity pulls it down. Meanwhile, the clean air is pulled up and into the middle of the separator.

This stage of separation serves to pull out the largest chips and dust so that the filter is not clogged by them. The most common homemade cyclonic dust separator is called the Thein Baffle. Its ease of manufacture is what sets it apart from other systems.

# DIY Thein Baffle Guide

The easiest form of cyclonic separator to make is the thein baffle. A cylindrical area sits on top of the collection bin, and a baffle separates the two. This baffle is a disk, which can be cut from plywood, with a ring cut out tangent to the walls of the separator, and that extends two-thirds of the way around the disk as shown.

![Thein Baffle](dust-separator/thein-baffle.webp)

This creates a slot for dust to fall through but keeps the inner baffle in place. The baffle reduces air speed in the dust collection bin and allows dust to settle out.

The inlet is tangent to the cylindrical area, and the outlet is out the top of the area just like any other cyclonic dust separator.

With combination of 4″ PVC and the harbor freight dust collector works together with an 18-gallon trash can to make a thein baffle with these dimensions:

1. Diameter of 17.5 inches
2. Cylindrical area height of 10 inches

Material:

1. Plywood Required: 2’x4′
2. Polycarbonate Required: 60″x10″

The cylindrical area can be made from 0.5″ plywood and cut with a router circle jig to cut slots in the disks. The walls of the cylinder are best made from 1/8″ polycarbonate. Polycarbonate can be bent around the diameter of the disks and is non-shattering if large chunks or sharp objects enter the separator. (Plus it allows you to see the separation in action.)

Note the orientation of the entrance to the baffle is critical. It should be located so that the pipe pieces the sidewall just where the slot in the baffle ends. Then as dust falls through the separator it lands within the slot.

Design templates can be found at the top of the article.

![Entire Collector](dust-separator/whole-collector.webp)

## Dust Collector Results

I made the thein baffle separator and added a couple of features to fit my workshop.

The trash can collection bin is not directly attached to the cylindrical separation area. Weather-stripping seals between the two and the bin is forced up into the seal by blocks underneath. They can be removed, and the bin drops out for easy emptying.

The dust collector blower is mounted atop the separation chamber to save space in my small basement shop.

Overall the separator works well. It separates everything out of the airstream except for the smallest of sanding dust, and can even pull up some large chunks of wood that get ingested. The blower and separator assembly has been maintenance-free for 5 years now. The only required work is changing the dust bin and occasionally shaking the filter free from fine dust.

#!g
![Baffle](dust-separator/baffle.webp){The Thein Baffle}
![Bin Seal](dust-separator/bin-seal.webp){Weather Stripping Seal}
![Bin Spacers](dust-separator/bin-spacers.webp){Bin Spacers / Mount}
![Fine Dust Bypass](dust-separator/fine-dust.webp){Fine Dust Bypass of Separator}
![Drum Sander Connection](dust-piping/drum-sander.webp){Drum Sander Connection}
#!g
