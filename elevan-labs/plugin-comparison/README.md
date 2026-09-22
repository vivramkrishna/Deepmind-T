# Voice Math visual plugin comparison

All samples use the same source-grounded brief: Chrome extension, local text calculator, signed ElevenLabs session, browser-to-agent WebSocket conversation, client calculator tool, and automatic agent creation from one API key.

## Recommendation

1. **draw.io — best architecture diagram tool.** It produced the clearest editable node-and-edge model and is the best fit for system architecture, sequence flows, and technical maintenance.
2. **Presenton — best fast presentation exporter.** It produced a coherent four-slide deck and returned PPTX, PDF, PNG, and preview links from the same source.
3. **Presentations — best controlled local PowerPoint.** Its PPTX passed package, layout, font, and re-import validation. It is a strong choice when exact content, editability, and repeatable local generation matter more than decorative polish.
4. **AI Graphic Design / Superdesign — best visual polish.** The AI Graphic Design version was the strongest single-page infographic. The architecture-oriented Superdesign draft looked polished but misplaced or omitted some components, so it needs a correction pass before technical use. Both are workflows on the same Superdesign service, not independent rendering engines.
5. **Presentation Generator — best simple narrative deck.** It produced a clean five-slide PPTX with claim-led slide titles and speaker notes. It is easy to present but visually plainer than Presenton or Superdesign.
6. **Visualize — best interactive explanation inside Codex.** Its step-through flow is useful for learning and debugging, though it is not an office-document deliverable.
7. **ImageGen — best static illustrative infographic.** It was visually rich, but its first pass invented calculus examples outside the app's supported scope. Use it for explanatory artwork only after careful factual review.
8. **Presentation Maker — useful diagram planning.** It supplied diagram type, labels, direction, and Mermaid source. In this environment it is an instruction workflow rather than a separate rendering service.

## Plugin results

| Plugin or workflow | Artifact | Editable | First-pass accuracy | Best use |
|---|---|---:|---|---|
| draw.io | Browser-opened Mermaid architecture diagram | Yes | Strong | Technical architecture |
| Presenton | PPTX, PDF, PNG, web preview | Mostly | Strong | Fast shareable deck |
| Presentations | Four-slide validated PPTX | Yes | Strong | Controlled PowerPoint |
| Presentation Generator | Five-slide PPTX | Yes | Strong | Narrative explainer |
| AI Graphic Design | Superdesign HTML infographic | Yes | Good; missing some auth detail | Polished one-page visual |
| Superdesign | Superdesign HTML architecture draft | Yes | Needs correction | Visual exploration |
| Visualize | Interactive step-through HTML | Yes | Strong | Learning in Codex |
| ImageGen | PNG infographic | No | Needs correction | Static artwork |
| Presentation Maker | Mermaid diagram specification | Source text | Strong | Planning diagram slides |
| Google Slides | Imported native deck | Yes | Import succeeded; readback blocked | Collaboration |
| Figma / FigJam | No generated artifact | — | — | Potentially excellent editable diagrams, but its diagram creation tool was not callable in this session |
| Canva | No generated artifact | — | — | Potentially strong branded decks, but its generation action was not callable in this session |

## Accuracy observations

- The ImageGen first pass showed calculus even though this app supports basic arithmetic, square root, powers, and percentages.
- The Superdesign architecture first pass omitted the browser from the demo-math path and visually placed a local API box on the cloud side of its boundary.
- The AI Graphic Design sample communicated the three flows well, but compressed the signed-URL server path into a label instead of fully diagramming the server.
- Both local PPTX workflows were rendered and visually inspected. The Presentations deck also passed structural and layout validation.
- The Google Slides import succeeded. A verification read was rejected after the account reached its connector usage limit, so conversion fidelity was not checked after upload.

## Local artifacts

- `output/presentations-voice-math.pptx` — validated four-slide deck.
- `output/presentation-generator-voice-math.pptx` — five-slide narrative deck.
- `output/ai-graphic-design.html` — editable polished infographic.
- `output/superdesign.html` — editable architecture draft.
- `output/imagegen-first-pass.png` — raster first pass with the accuracy issue noted above.
- `output/presentation-maker-diagrams.md` — diagram plan and Mermaid source.
- `brief.md` — common factual brief used for comparisons.

## Practical choice

Use draw.io for the canonical engineering diagram. Use Presenton for a fast downloadable presentation. Use Presentations when you need a controlled, validated PowerPoint generated locally. Use Superdesign or AI Graphic Design when visual polish matters and a human will review the technical details. Use ImageGen as supporting artwork, not as the source of truth for architecture.
