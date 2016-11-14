/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Assemble plugin to create an RSS feed from a collection.
 *
 * @return {Function}
 */

function plugin(name) {
    return function(app) {
        var files = app.getViews(name),
            RSS = require('rss'),
            path = require('path'),
            fs = require('fs'),
            entries = [],
            pkg = app.pkg.data,
            site = pkg.homepage,
            siteData = app.cache.data.site,
            buildDir = pkg.config.buildDir,
            author = pkg.authors[0].slice(0, -1).split('<'),
            rssEntries,
            feed,
            rssPath = process.cwd() + '/build/rss.xml';

        for (var fileName in files) {
            var file = files[fileName],
                fp = file.path,
                extname = path.extname(fp),
                filename = path.basename(fp, extname),
                link = file.data.permalink
                    .replace(buildDir, site)
                    .replace('index.html', ''),
                parsedFile = {};

            parsedFile.link = link;
            parsedFile.created = file.stat.birthtime;
            parsedFile.changed = file.stat.mtime || file.stat.birthtime;
            parsedFile.published = file.data.posted;
            if (parsedFile.changed < parsedFile.published) {
                parsedFile.changed = parsedFile.published;
            }
            if (parsedFile.created > parsedFile.published) {
                parsedFile.created = parsedFile.published;
            }

            parsedFile.title = file.data.title;
            parsedFile.description = file.data.excerpt;
            parsedFile.category = file.data.category;

            if (file.data.featuredImage) {
                var imageUrl = site + '/assets/images/gallery/' + file.data.featuredImage.revSrc,
                    imagePath = process.cwd() + '/build/assets/images/gallery/' + file.data.featuredImage.src,
                    size = 0,
                    stats;
                try {
                    stats = fs.statSync(imagePath);
                    size = stats['size'];
                } catch (e) {}

                parsedFile.featuredImage = {
                    url: imageUrl,
                    size: size
                };
            }

            entries.push(parsedFile);
        }

        entries.sort(function (a, b) {
            return b.published - a.published;
        });

        rssEntries = entries.slice(0, 20);

        feed = new RSS({
            title: siteData.title,
            description: pkg.description,
            feed_url: pkg.homepage + '/rss.xml',
            site_url: pkg.homepage,
            image_url: pkg.homepage + '/assets/favicon/android-icon-192x192.png',
            managingEditor: author[1].trim() + ' (' + author[0].trim() + ')',
            webMaster: author[1].trim() + ' (' + author[0].trim() + ')',
            copyright: siteData.copyright,
            language: siteData.language,
            pubDate: rssEntries[0].published,
            ttl: '60'
        });

        rssEntries.forEach(function (entry) {
            var item = {
                title: entry.title,
                description: entry.description,
                categories: [entry.category],
                url: entry.link, // link to the item
                date: entry.published//, any format that js Date can parse.
            };

            if (entry.featuredImage) {
                item.enclosure = entry.featuredImage;
            }

            feed.item(item);
        });

        fs.writeFile(rssPath, feed.xml(), function (err) {
            if (err) {
                throw err;
            }

            console.log(rssPath + ' created successfully');
        });
    };
}
