---
id: example-after-work
number: C4
title: After work
part: C
---

Feed in the morning before work, mix the dough when you get home and shape it at bedtime, then leave it in the fridge until you are home the next day. This is the most "life-friendly" approach: you only need short bursts of hands-on time. It skips the autolyse, a time-saving trick for a day when you have no spare hour (see [[process#step-2-autolyse|Step 2, autolyse]] for what you give up). It is also a good example of working backwards from when you want to eat.

{{planSettings afterWork}}

## The plan

{{planFigure afterWork}}

Day 1. Feed the starter at {{time afterWork feed}}, before you leave. It is ready when you are back, so there is no autolyse: the flour, water and starter all go in together at {{time afterWork starterIn}}, and bulk starts then. The folds are over by {{time afterWork fold4}}, and the dough is shaped at {{time afterWork finalShape}} and goes into the fridge.

Day 2. Turn the oven on at {{time afterWork ovenOn}} and bake at {{time afterWork bake}}. The loaf is ready to carve at {{time afterWork carve}}, {{fromFeed afterWork}} after the first feed.

## Working backwards {#working-backwards}

You want to carve at about {{at afterWork carve}}, after work. Start there and subtract each step in turn. The numbers are the app's, so you can check them against the plan above.

1. Carve at {{at afterWork carve}}. The loaf cools for {{coolingLong}} minutes first, so it comes out of the oven at {{at afterWork out}}.
2. Bake. The time in the pot for a regular loaf is in the table in [[baking#dutch-oven|section 11]], so it goes in at {{at afterWork bake}}.
3. Preheat. The oven and pot take {{preheat}} minutes, so turn the oven on at {{at afterWork ovenOn}}.
4. Fridge. The dough went in at {{at afterWork fridge}}, so it has had {{fridgeHours afterWork}} hours there. Anything from {{fridgeMin}} to {{fridgeMax}} hours would do.
5. Shape. Final shape at {{at afterWork finalShape}}, after the pre-shape and its {{benchRest}} minute rest at {{at afterWork preShape}}. This is also when bulk ends.
6. Bulk. Dough at 26°C needs {{bulk 26}}. Bulk is counted from when the starter went in, at {{at afterWork starterIn}}, and the fermentolyse, the salt rest and the folds all come inside that time. The plan uses the longer end of the range.
7. Autolyse. Skipped here, so the flour, water and starter are mixed together when you get in, at {{at afterWork starterIn}}. With an hour's autolyse you would be mixing an hour earlier, which is not possible after work.
8. Feed. A 1:6:6 feed takes {{feedWindow 6}} to be ready, so feed at {{at afterWork feed}}.
