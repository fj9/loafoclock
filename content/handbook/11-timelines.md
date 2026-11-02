---
id: timelines
number: 8
title: Timelines that fit around a life
part: B
---

These examples are worked out by the app's planner, so every step that needs you falls in waking hours (6:00 am to 11:00 pm). Days are called Day 1, Day 2 and so on, because the bake can start on any day. Use the planner to fit them to your own kitchen and day. Each one shows when the loaf is ready to carve, the whole bake on one bar, and the steps in order.

## Two days, early start

Feed in the morning, mix in the early afternoon, shape in the evening and bake from the fridge the next morning. The dough is only in the fridge for the final proof.

{{planFigure earlyStart}}

**Day 1.** Feed the starter at {{time earlyStart feed}}. The flour and water go together at {{time earlyStart autolyse}}, and the starter goes in at {{time earlyStart starterIn}}, when it is at its peak. The salt, honey and oil follow at {{time earlyStart salt}}, then four folds, {{foldGap}} minutes apart. At 24°C the bulk takes about 7 hours, so the dough is shaped in the evening and goes into the fridge at {{time earlyStart fridge}}.

**Day 2.** Turn the oven on at {{time earlyStart ovenOn}} and bake straight from the fridge at {{time earlyStart bake}}. The loaf is out at {{time earlyStart out}}, and ready to carve an hour later, at {{time earlyStart carve}}.

## Three days, late feed

Feed in the evening, mix first thing the next morning, shape in the afternoon and bake from the fridge on the third day. A bigger feed (1:7:7 here) gives the starter the night to rise. A 1:6:6 would be ready an hour earlier, so the whole of Day 2 would start an hour earlier too.

{{planFigure lateFeed}}

**Day 1.** Feed the starter at {{time lateFeed feed}} and go to bed. It rises overnight.

**Day 2.** The flour and water go together at {{time lateFeed autolyse}}, the starter goes in at {{time lateFeed starterIn}} and the salt, honey and oil at {{time lateFeed salt}}. After four folds the bulk runs on to the afternoon: the dough is shaped at {{time lateFeed finalShape}} and goes into the fridge at {{time lateFeed fridge}}.

**Day 3.** Turn the oven on at {{time lateFeed ovenOn}}, bake at {{time lateFeed bake}}, and carve at {{time lateFeed carve}}.

## Same-day bake, no fridge

A quick feed, a warm dough and 2 to 3 hours of proofing on the counter. It is quicker but gives a less sour loaf.

{{planFigure sameDay}}

Everything happens on the one day. The starter is fed at {{time sameDay feed}} and goes in at {{time sameDay starterIn}}. A warm dough (27°C) bulks for about 5 and a half hours, so it is shaped at {{time sameDay finalShape}} and proofs on the counter. The oven goes on at {{time sameDay ovenOn}}, the loaf goes in at {{time sameDay bake}} and it is ready to carve at {{time sameDay carve}}.

## After work, bake the next evening

Feed in the morning and mix in the afternoon, so the dough is shaped at bedtime and goes in the fridge until you are home the next day. This is the most "life-friendly" approach: you only need ten minutes here and there.

{{planFigure afterWork}}

**Day 1.** Feed the starter at {{time afterWork feed}}, before you leave. It is ready when you are back, so the flour and water go together at {{time afterWork autolyse}} and the starter goes in at {{time afterWork starterIn}}. The folds are over by {{time afterWork fold4}}, and the dough is shaped at {{time afterWork finalShape}} and goes into the fridge.

**Day 2.** Turn the oven on at {{time afterWork ovenOn}} and bake at {{time afterWork bake}}. The loaf is ready to carve at {{time afterWork carve}}.

## Long and slow

The same dough, kept in the fridge for a day and a half for a tangier loaf and a bake that suits a weekend.

{{planFigure longAndSlow}}

**Day 1** is the same as the bake after work: the dough is in the fridge by {{time longAndSlow fridge}}.

**Day 2.** Nothing to do. The dough stays in the fridge.

**Day 3.** Turn the oven on at {{time longAndSlow ovenOn}}, bake at {{time longAndSlow bake}}, and carve at {{time longAndSlow carve}}.

## Working backwards

To plan any bake:

- Decide when you want to **eat** or **bake**.
- Subtract the bake: {{preheat}} minutes to preheat the oven, then the bake itself (see [[baking]]).
- Subtract the final proof (2 to 3 hours on the counter, {{fridgeMin}} to {{fridgeMax}} hours in the fridge).
- Subtract the pre-shape and shape (about 45 minutes).
- Subtract the bulk, counted from when the starter goes in (see [[process#bulk|section 6, step 5]]).
- Subtract the fermentolyse and the autolyse before it ({{restMin}} to {{restMax}} minutes each).
- Subtract the starter build, so that the starter is ready when it goes in (see [[starter#feeding-and-ratios|section 3.3]]).

[[worked-example#working-backwards|A worked example of working backwards]] follows these steps with real times.
