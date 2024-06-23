module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // uglify: {
        //     options: {
        //         banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        //     },
        //     build: {

        //     }
        // },
        minifyHtml: {
            options: {
                cdata: true
            },
            dist: {
                files: {
                    'dist/ack/index.html': 'src/ack/index.html',
                    'dist/app.css': 'src/app.css',
                    'dist/common/github.html': 'src/common/github.html',
                    'dist/common/navigation.html': 'src/common/navigation.html',
                    'dist/edi40/index.html': 'src/edi40/index.html',
                    'dist/edi40/2024/index.html': 'src/edi40/2024/index.html',
                    'dist/edi40-2023/index.html': 'src/edi40-2023/index.html',
                    'dist/graph/index.html': 'src/graph/index.html',
                    'dist/index.html': 'src/index.html',
                    'dist/doc/index.html': 'src/doc/index.html',
                    'dist/research/index.html': 'src/research/index.html',
                    'dist/reset.css': 'src/reset.css'
                }
            }
        },
        // Configuration for copy tasks
        copy: {
            dist: {
                files: [
                    { expand: true, cwd: 'src/ack/', src: ['index.html'], dest: 'dist/ack/' },
                    { expand: true, cwd: 'src/', src: ['app.css'], dest: 'dist/' },
                    { expand: true, cwd: 'src/common/', src: ['github.html', 'navigation.html'], dest: 'dist/common/' },
                    { expand: true, cwd: 'src/edi40/', src: ['index.html'], dest: 'dist/edi40/' },
                    { expand: true, cwd: 'src/edi40/2024/', src: ['index.html'], dest: 'dist/edi40/2024/' },
                    { expand: true, cwd: 'src/edi40-2023/', src: ['index.html'], dest: 'dist/edi40-2023/' },
                    { expand: true, cwd: 'src/graph/', src: ['index.html'], dest: 'dist/graph/' },
                    { expand: true, cwd: 'src/', src: ['index.html'], dest: 'dist/' },
                    { expand: true, cwd: 'src/doc/', src: ['index.html'], dest: 'dist/doc/' },
                    { expand: true, cwd: 'src/research/', src: ['index.html'], dest: 'dist/research/' },
                    { expand: true, cwd: 'src/', src: ['reset.css'], dest: 'dist/' }
                ]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    // grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-minify-html');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['copy']);
};