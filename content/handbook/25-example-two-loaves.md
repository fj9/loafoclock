---
id: example-two-loaves
number: C5
title: Two loaves
part: C
---

Make a double batch, shape two loaves, and put both in the fridge together. One is baked after {{fridgeHours twoLoavesFirst}} hours and the other after {{fridgeHours twoLoavesSecond}}, so you have a loaf on Day 3 and another on Day 4, 24 hours apart. The second loaf spends longer in the cold, so it is the more sour of the two. That is useful if you want fresh bread on two different days, or one loaf to give away.

It follows the [[example-overnight-feed|overnight feed timeline]] exactly, with double the amounts and one extra step: after the bulk, divide the dough in two at the pre-shape. The first loaf has the same {{fridgeHours twoLoavesFirst}} hours in the fridge as the overnight feed timeline. The second stays in for {{fridgeHours twoLoavesSecond}} hours, so it bakes 24 hours later, also in the morning.

{{planSettings twoLoavesFirst}}

## The amounts

For two regular loaves:

{{amountsTable 2}}

Feed {{feedFor 7 2}}. A 1:7:7 is ready in {{feedWindow 7}}. It makes enough for the dough and {{keepBack}} g to keep back as your next starter. Mix the dough in one bowl or tub.

## The plan

This is the first loaf, with {{fridgeHours twoLoavesFirst}} hours in the fridge. It is the same plan as the overnight feed, with two loaves in it.

{{planFigure twoLoavesFirst twoLoavesSecond}}

Day 1. Feed the starter at {{time twoLoavesFirst feed}} and go to bed. It rises overnight.

Day 2. The flour and water go together at {{time twoLoavesFirst autolyse}}, the starter goes in at {{time twoLoavesFirst starterIn}} and the salt, honey and oil at {{time twoLoavesFirst salt}}. After {{foldCount}} folds the bulk runs on into the afternoon. When it is done, at {{time twoLoavesFirst preShape}}, divide the dough in half, pre-shape both pieces, rest them {{benchRest}} minutes and shape them. Both go into the fridge at {{time twoLoavesFirst fridge}}.

Day 3. Bake the first loaf and leave the other in the fridge. Turn the oven on at {{time twoLoavesFirst ovenOn}}, bake at {{time twoLoavesFirst bake}}, and carve at {{time twoLoavesFirst carve}}, {{fromFeed twoLoavesFirst}} after the first feed.

Day 4. Bake the second loaf the same way: oven on at {{time twoLoavesSecond ovenOn}}, bake at {{time twoLoavesSecond bake}} and carve at {{time twoLoavesSecond carve}}.

## The second loaf

The second loaf stays in the fridge for {{fridgeHours twoLoavesSecond}} hours, and is baked in exactly the same way, 24 hours later. Day 1 and Day 2 are the same as the first loaf's, so only the end is different.

The app allows up to {{fridgeMax}} hours in the fridge, so {{fridgeHours twoLoavesSecond}} is well inside it.

Keep the second loaf covered, and check it before you bake: a dough left in the fridge this long is looser and more sour. If it has spread or feels slack, shape it again, rest it for 30 minutes and bake it a little sooner.
