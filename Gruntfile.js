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
                    {
                        expand: true,      // Enable dynamic expansion
                        cwd: 'src/',       // Src matches are relative to this path
                        src: ['**'],       // Pattern to match all files and subfolders
                        dest: 'dist/',     // Destination path prefix
                        dot: false          // Include hidden files
                    }
                ]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    // grunt.loadNpmTasks('grunt-contrib-uglify-es');
    // grunt.loadNpmTasks('grunt-minify-html');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['copy']);
};