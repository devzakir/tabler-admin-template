const gulp = require('gulp'),
	glob = require('glob'),
	fs = require('fs'),
	sass = require('gulp-sass'),
	tildeImporter = require('node-sass-tilde-importer'),
	clean = require('gulp-clean'),
	postcss = require('gulp-postcss'),
	path = require('path'),
	minifyJS = require('gulp-minify'),
	cleanCSS = require('gulp-clean-css'),
	rollup = require('gulp-rollup'),
	rename = require('gulp-rename'),
	browserSync = require('browser-sync'),
	gulpCopy = require('gulp-copy'),
	YAML = require('yaml'),
	cp = require('child_process');

let BUILD = false,
	distDir = 'tmp-dist',
	distDirHtml = 'tmp';

gulp.task('build-on', function(cb) {
	BUILD = true;
	distDir = 'dist';
	distDirHtml = 'demo';
	cb();
});

const generateIconsYml = function (dir, filename) {
	const files = glob.sync(dir);
	let svgList = {};

	const prepareSvgFile = function (svg) {
		return svg.replace(/\n/g, '').replace(/>\s+</g, '><');
	};

	files.forEach(function (file) {
		const basename = path.basename(file, '.svg');
		svgList[basename] = prepareSvgFile(fs.readFileSync(file).toString());
	});

	fs.writeFileSync(filename, YAML.stringify(svgList));
};

gulp.task('svg-icons', function (cb) {
	generateIconsYml("./node_modules/tabler-icons/icons/*.svg", './pages/_data/icons-tabler.yml');
	generateIconsYml("./svg/brand/*.svg", './pages/_data/icons-brand.yml');
	cb();
});

gulp.task('clean', function () {
	return gulp
		.src('{dist/css,./.tmp}', { read: false })
		.pipe(clean());
});

gulp.task('js', function() {
	const g = gulp.src('./js/**/*.js')
		.pipe(rollup({
			output: {
				format: 'umd'
			},
			input: './js/tabler.js'
		}))
		.pipe(gulp.dest(`./${distDir}/js/`));

	if (BUILD || 1===1) {
		g.pipe(minifyJS({
			ext: {
				min: '.min.js'
			}
		}))
			.pipe(gulp.dest(`./${distDir}/js/`));
	}

	return g;
});

gulp.task('sass', function () {
	const g = gulp
		.src('scss/*.scss')
		.pipe(sass({
			style: 'expanded',
			importer: tildeImporter,
		}).on('error', sass.logError))
		.pipe(postcss([
			require('autoprefixer'),
		]))
		.pipe(gulp.dest(`./${distDir}/css/`))
		.pipe(browserSync.reload({
			stream: true,
		}));

	if (BUILD) {
		g.pipe(cleanCSS())
			.pipe(rename(function (path) {
				path.basename += '.min';
			}))
			.pipe(gulp.dest(`./${distDir}/css/`));
	}

	return g;
});

gulp.task('watch', function(cb) {
	gulp.watch('./scss/**/*.scss', gulp.series('sass'));
	gulp.watch('./js/**/*.js', gulp.series('js'));
	cb();
});

gulp.task('watch-jekyll', function(cb) {
	browserSync.notify('Building Jekyll');
	return cp.spawn('bundle', ['exec', 'jekyll', 'build', '--watch', '--destination', distDirHtml], { stdio: 'inherit' })
		.on('close', cb);
});

gulp.task('browser-sync', function() {
	browserSync({
		watch: true,
		server: {
			baseDir: 'tmp',
			routes: {
				'/node_modules': 'node_modules',
				'/dist/css': 'tmp-dist/css',
				'/dist/js': 'tmp-dist/js',
				'/dist/img': 'img',
				'/static': 'static',
				'/img-sample': 'img-sample',
			},
		},
		port: 3000,
		open: false,
		host: 'localhost',
		notify: false,
		reloadOnRestart: true
	});
});

gulp.task('start', gulp.series('clean', 'sass', 'js', gulp.parallel('watch-jekyll', 'watch', 'browser-sync')));

gulp.task('build', gulp.series('clean', 'sass', 'js'));
