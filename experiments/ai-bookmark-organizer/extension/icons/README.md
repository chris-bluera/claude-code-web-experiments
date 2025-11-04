# Extension Icons

This directory should contain the extension icons in the following sizes:
- icon16.png (16x16px)
- icon32.png (32x32px)
- icon48.png (48x48px)
- icon128.png (128x128px)

## Creating Icons

You can create icons using any graphics editor. Here are some suggestions:

### Design Guidelines
- Use a bookmark or bookshelf theme
- Include AI/tech elements (circuit, brain, sparkles)
- Use colors: Blue/purple for tech, warm colors for bookmarks
- Keep it simple and recognizable at small sizes

### Recommended Colors
- Primary: #4f46e5 (Indigo)
- Accent: #10b981 (Green)
- Background: White or transparent

### Quick Icon Generation

1. **Using Online Tools:**
   - https://favicon.io/
   - https://realfavicongenerator.net/
   - https://www.iconfinder.com/

2. **Using AI:**
   - Use DALL-E, Midjourney, or Stable Diffusion
   - Prompt: "Simple, modern icon for AI bookmark organizer app, minimalist design, blue and purple colors, vector style"

3. **Placeholder:**
   For testing, you can create simple colored squares with text using any image editor.

### Command-line Generation (ImageMagick)

```bash
# Create simple placeholder icons
convert -size 16x16 xc:#4f46e5 -pointsize 10 -fill white -gravity center -annotate +0+0 "B" icon16.png
convert -size 32x32 xc:#4f46e5 -pointsize 20 -fill white -gravity center -annotate +0+0 "B" icon32.png
convert -size 48x48 xc:#4f46e5 -pointsize 30 -fill white -gravity center -annotate +0+0 "B" icon48.png
convert -size 128x128 xc:#4f46e5 -pointsize 80 -fill white -gravity center -annotate +0+0 "B" icon128.png
```

## Note

Without proper icons, the extension will still work, but Chrome will show a default icon placeholder.
