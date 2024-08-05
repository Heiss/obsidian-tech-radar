# Obsidian Tech Radar

Needs [Dataview](https://github.com/blacksmithgu/obsidian-dataview) to work.

## Usage

Give examples of how to use the plugin.

### Note Frontmatter

This plugin uses the frontmatter of notes to determine the category and the ring of the radar. The frontmatter should
look like this:

```yaml
---
tags: tech
ring: 0
moved: 2
---
```

- `tags` is the category of the note. It can be anything, but it should be the same for all notes that belong to the
  same category. In the next step, you will specify which tags you want to looking for. Tag a note with the wanted
  category and in the next step, the plugin will find it and add it to the radar.
- `ring` is the ring of the radar. It is a number between 0 and 3. It is the wanted ring in the radar. In the next step,
  the names of the rings will be specified.
- `moved` marks the item and show, if it gots bumped or dumped in the radar. It is a number between -1 and 2.
	- -1 = moved out (triangle pointing down)
	- 0 = not moved (circle)
	- 1 = moved in  (triangle pointing up)
	- 2 = new       (star)

### Include in Notes

Now you can integrate your radar into a note. Just add the following code block to your note:

````
```tech-radar
repo_url: "https://github.com/heiss/obsidian-tech-radar"
colors:
  background: "#fff"
  grid: "#bbb"
  inactive: "#ddd"
title: "Example Tech Radar"
quadrants:
  - name: "Tech"
    tags:
      - tech
      - test
  - name: "Platform"
    tags:
      - platform
  - name: "Top Left"
  - name: "Top Right"
rings:
  - name: "Hold"
    color: "#5ba300"
  - name: "Assess"
    color: "#009eb0"
  - name: "Trial"
    color: "#c7ba00"
  - name: "Adopt"
    color: "#e09b96"
links_in_new_tabs: true
```
````

You see, there are a lot of options and you can customize your radar as you like.

Beware: `rings` and `quadrants` have to have 4 elements. Set your tags in all quadrants, even if you don't have notes.
So later the plugin can find the right notes. You can reuse tags in multiple quadrants, too. But this does not make much
sense, but maybe you have a good reason for it.

After this, you will see your radar in the note. Click anywhere on the radar to open it in a new tab and to see it
bigger.

You can have multiple radars in the same or different note. Just add the code block multiple times and configure it to
your needs.

## Installation

Give a link to the community store

## Contributing

If you want to contribute to the project, download the repository and run `npm install` to install the dependencies.
Then, run `npm run dev` to start the development server.

Beware: The project uses stuff from third-party, which does not get bundled into build artifacts. If you change
something in `radar.js` or `radar.css`, you need to run `npm run build` or disable and enable the plugin in Obsidian
manually. Tools like [ hot-reload obsidian ](https://github.com/pjeby/hot-reload) does not recognize changes in these
files.

