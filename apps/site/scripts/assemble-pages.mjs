import { access, cp, writeFile } from 'node:fs/promises';

const siteDist = new URL( '../dist/', import.meta.url );
const storybookDist = new URL(
	'../../../storybook/storybook-static/',
	import.meta.url
);

// Both builds must finish before publishing anything. Vite clears site/dist
// during the site build, so each assembled artifact starts fresh.
await Promise.all( [
	access( new URL( 'index.html', siteDist ) ),
	access( new URL( 'index.html', storybookDist ) ),
] );
await cp( storybookDist, new URL( 'storybook/', siteDist ), {
	recursive: true,
} );
await writeFile( new URL( '.nojekyll', siteDist ), '' );

console.log( 'Assembled the site and Storybook in apps/site/dist.' );
