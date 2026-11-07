---
title: Heretic — how refusals are removed from a model
description: A short note about an algorithm that strips “censorship” out of a language model.
---

[Heretic](https://github.com/p-e-w/heretic) is an algorithm that removes restrictions (censorship) from a language model, meaning its refusals to answer certain questions.

A refusal doesn't live in a single neuron: it's a direction in the model's activation space. You find it by comparing how the model reacts to “harmless” and “forbidden” prompts. Then the model's weights are edited so that it can no longer move in that direction. The method is called *abliteration* (directional ablation).

Heretic does this automatically: it tunes the parameters itself so that there are as few refusals as possible while the model otherwise answers the same way as before.
