#! title: 0.4 Aluminum Extrusion Cutting
#! date: 1/25/2024
#! tags: aluminum, extrusion, cutting, miter saw, laser cutter, build, construction, design, materials, preparation, assembly, bin, packing, algorithm, optimization, efficiency, laser
#! description: Optimizing the cutting of aluminum extrusions for the K400 Laser Cutter frame.
#! author: Eli Bukoski
#! image: laser04/finished-cuts.webp

## The Backbone of the Project: Aluminum Extrusion

8020 aluminum extrusion is the framing material of choice for my laser cutter project. It’s a lightweight, but extremely versatile shape of extruded metal. 8020 is the common brand name, but it is also known as t-slotted framing on McMaster-Carr. It is a rectangular shape with t-slot features on the 4 long faces. The inside of the extrusion is directly accessible from the ends and is usually hollow to optimize for minimal material use.

![2040 and 2020 Extrusion](laser04/extrusion.webp)

Lengths of 8020 extrusions are connected via brackets. The brackets are bolted to the extrusion with bolts and t-nuts that interface in the t-slots of the extrusion. This allows the brackets to be adjusted freely up and down the extrusion.

![Multiple brackets on a piece of extrusion](laser04/bracket-and-extrusion.webp)

The versatility of aluminum extrusion is furthered by different size and shape versions. Aluminum extrusion at its smallest is 20 mm by 20 mm, it is square and has 1 t-slot on each face. It also has imperial variants at 1 by 1 inch and even 1.5 inch by 1.5 inch. The next step up is rectangular extrusions, 20mm by 40 mm, or a similar imperial variant. It has two t-slots on the 40mm length sections. There are also 40mm by 40mm, 20mm by 60mm, and a wide combination of bigger versions. I stuck with the base two sizes, 20 x 20 and 20 x 40 for this project, as a laser cutter is a low force CNC machine. Lighter structural members help with accelerations too. Note something like a CNC router or mill needs much stronger structure.

![Two types of extrusion](laser04/different-extrusion-types.webp)

In the rest of this project, I will refer to 20mm by 20mm aluminum extrusion as 2020 and 20mm by 40mm by 2040\. It’s just a little bit more clear and concise.

### How Much Material is Needed?

The laser uses a wide range of lengths of extrusion. Some vendors will do cut-to-length sections where the customer submits a list of lengths needed, and the exact lengths are shipped. However, there is usually a fairly large fee for cut to length, so I opted to purchase 6ft sections of extrusion and cut them down myself.

This still doesn’t answer the question though, how many 6ft sections do we need? We could add up all the lengths and divide by 6ft, but this introduces some problems. What if in that division the lengths aren’t all divisible by 6ft. Some lengths might be split into two 6ft sections. For example, if we need 6 4ft sections, we need a total of 24ft of extrusion. You might assume since 24ft / 6ft sections this means we need 4 sections, but in reality, we need 6. You can’t get 1.33 4ft sections out of a 6ft length; you can only get 1. The actual solution involves a type of algorithm called bin-packing.

## Bin-Packing Algorithm

The bin packing algorithm is a classic optimization problem in computer science and mathematics that deals with efficiently packing a set of items of varying sizes into a minimal number of containers or bins, each with a fixed capacity. The objective is to minimize the number of bins used while ensuring that no bin exceeds its maximum capacity.

### Modifying the Bin Packer for Our Needs

The bin packing algorithm is such a common use, that it can be imported as a pre-made library of code into a Python file. We can create a Python program that uses the bin-packing algorithm library and imports data from a file to save time.

![CSV file of cut lengths](laser04/extrusion-lengths.webp)

I tallied up each length of extrusion, the quantity needed, and of which type 2020/2040 in a spreadsheet. This can then be exported in something known as a CSV, or comma separated value file. Importing from CVS file saves time getting this information into our packing program. Python can read the file and pull in all the data, as well as apply a quantity multiplier, and separate 2020 from 2040 extrusion.

![Imported data](laser04/imported-lengths.webp)

Then the program asks the user for the stock length it will try to pack extrusions into. The cutting process that takes a single stock and cuts it into multiple pieces introduces another factor into the equation, kerf. A saw removes material as it cuts; the width of the blade. So the program needs to account for this material with each cut.

![Output of the bin-packing algorithm](laser04/output-cuts-list.webp)

With all of the information provided, the program then computes the best possible use of material. It displays each cut length for each piece of stock on the terminal, and it saves it to a file for future reference when we cut the stock. The count of these stocks is given, and we can order the correct amount of aluminum extrusion needed.

You can download and try the bin-packer for aluminum extrusion
[from Github (Leaving Bukoski.dev)](https://github.com/Mapy542/2020-Extrusion-Cut-Optomizer).
You need Python3 and some packages from Pip.

## Cutting Extrusion

I ordered extrusion from the website:
[tnutz.com (Leaving Bukoski.dev)](https://www.tnutz.com/).

They were by far the most affordable option I could find. McMaster Carr and 8020.com both provide shipped cut-to-length aluminum extrusion, but the cost is almost double. While ordering the required number of extrusions, I got an extra length of 2020 and 2040 just in case and purchased t-slot mountable hinges for the laser doors.

After all the lengths of aluminum have been decided, and the cut list made, it’s time to cut the aluminum. There are a couple of ways to do so, from the simple hacksaw to a cold metal saw. This project needs the ends of the cut pieces to be square and even. Plus there were nearly 100 pieces. Trying to cut all of those with a hacksaw would be time consuming. On the other hand, a professional metal-cutting saw is incredibly expensive, a key point the project is trying to avoid. There is a middle ground though: using non-ferrous metal blades in a standard miter saw.

![Blade used for cutting aluminum](laser04/non-ferrous-blade.webp)

As a woodworking hobbyist, I already had a 10-inch miter saw on hand. It’s easy to switch to a non-ferrous metal blade and get accurate and fast cuts using the saw. I used this
[TOMAX 10″ Blade (Leaving Bukoski.dev)](https://a.co/d/iRVCn8t)
from Amazon (No affiliation). While not necessarily high-end, the blade stood up to all of the cuts I used it for and produced a great surface finish.

![All cut pieces](laser04/finished-cuts.webp)

### Safety

When using a metal saw blade there are a few things to keep in mind.

1. Kickback: Unlike wood, aluminum fights back. The part may be grabbed by the blade, pulling it into the saw. This ruins the part, the blade, and can be dangerous to the operator. They may be pulled into the cut too, and sharp cutting material (braised carbide teeth) may be ejected towards them.
2. Chips: the blade will make small, sharp, and hot aluminum shavings or chips.

When cutting aluminum, personal protective equipment should be worn, but the workpiece MUST be clamped down to the saw. Only a clamp is strong enough to keep the piece in place. Wood may bind onto the blade, and cause a stall, but aluminum just immediately kicks back. Some cutting lubricant can help too, but I found it to be not required.

These steps are incredibly important to remember. I’ve seen a saw blade and part be ruined in the blink of an eye by this kickback. Thankfully no one was injured, and no issues occurred when cutting extrusion for the laser.

The next steps are to take this cut aluminum and start assembling the laser. This starts with the bed and bed lift system.

[Next: 0.5 Building the Bed Lift System](/K400-Updates/05-Bed-Lift-System)
[Previous: 0.3 Building the Laser Base](/K400-Updates/03-Base-Build)
[Back to Homepage](/k400-home)
