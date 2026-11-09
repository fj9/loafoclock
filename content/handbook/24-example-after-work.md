---
id: example-after-work
number: C4
title: After work, bake the next evening
part: C
---

Feed in the morning, mix in the afternoon and shape at bedtime, then leave the dough in the fridge until you are home the next day. This is the most "life-friendly" approach: you only need short bursts of hands-on time. It is also a good example of working backwards from when you want to eat.

## The plan

{{planFigure afterWork}}

Day 1. Feed the starter at {{time afterWork feed}}, before you leave. It is ready when you are back, so the flour and water go together at {{time afterWork autolyse}} and the starter goes in at {{time afterWork starterIn}}. The folds are over by {{time afterWork fold4}}, and the dough is shaped at {{time afterWork finalShape}} and goes into the fridge.

Day 2. Turn the oven on at {{time afterWork ovenOn}} and bake at {{time afterWork bake}}. The loaf is ready to carve at {{time afterWork carve}}, {{fromFeed afterWork}} after the first feed.

## Working backwards {#working-backwards}

You want to carve at about {{at afterWork carve}}, after work. Start there and subtract each step in turn. The numbers are the app's, so you can check them against the plan above.

1. Carve at {{at afterWork carve}}. The loaf cools for {{coolingLong}} minutes first, so it comes out of the oven at {{at afterWork out}}.
2. Bake. The time in the pot for a regular loaf is in the table in [[baking#dutch-oven|section 11]], so it goes in at {{at afterWork bake}}.
3. Preheat. The oven and pot take {{preheat}} minutes, so turn the oven on at {{at afterWork ovenOn}}.
4. Fridge. The dough went in at {{at afterWork fridge}}, so it has had just under 20 hours there. Anything from {{fridgeMin}} to {{fridgeMax}} hours would do.
5. Shape. Final shape at {{at afterWork finalShape}}, after the pre-shape and its {{benchRest}} minute rest at {{at afterWork preShape}}. This is also when bulk ends.
6. Bulk. Dough at 26°C needs {{bulk 26}}. Bulk is counted from when the starter went in, at {{at afterWork starterIn}}, and the fermentolyse, the salt rest and the folds all come inside that time. The plan uses the longer end of the range.
7. Autolyse. The autolyse starts {{restDefault}} minutes before the starter goes in, at {{at afterWork autolyse}}.
8. Feed. A 1:6:6 feed takes {{feedWindow 6}} to be ready, so feed at {{at afterWork feed}}.
