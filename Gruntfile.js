module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'src/app.js',
                dest: 'dist/app.min.js'
            }
        },
        minifyHtml: {
            options: {
                cdata: true
            },
            dist: {
                files: {
                    'dist/index.html': 'src/index.html',
                    'dist/manual/index.html': 'src/manual/index.html',
                    'dist/ext/index.html': 'src/ext/index.html',
                    'dist/ack/index.html': 'src/ack/index.html',
                    'dist/graph/index.html': 'src/graph/index.html',
                    'dist/research/index.html': 'src/research/index.html',
                    'dist/app.css': 'src/app.css',
                    'dist/reset.css': 'src/reset.css'
                }
            }
        },
        copy: {
            main: {
                files: [
                    { expand: true, cwd: 'src/lib', src: ['./*'], dest: 'dist/lib', filter: 'isFile' },
                    { expand: true, cwd: 'src/img', src: ['./*'], dest: 'dist/img', filter: 'isFile' }
                ],
            },
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-minify-html');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['uglify', 'minifyHtml', 'copy']);
};