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
                    'dist/ack/index.html': 'src/ack/index.html',
                    'dist/app.css': 'src/app.css',
                    'dist/common/github.html': 'src/common/github.html',
                    'dist/common/navigation.html': 'src/common/navigation.html',
                    'dist/conference/index.html': 'src/conference/index.html',
                    'dist/developer/index.html': 'src/developer/index.html',
                    'dist/edi40/index.html': 'src/edi40/index.html',
                    'dist/edi40/2024/index.html': 'src/edi40/2024/index.html',
                    'dist/edi40-2023/index.html': 'src/edi40-2023/index.html',
                    'dist/graph/index.html': 'src/graph/index.html',
                    'dist/index.html': 'src/index.html',
                    'dist/arch/index.html': 'src/arch/index.html',
                    'dist/research/index.html': 'src/research/index.html',
                    'dist/reset.css': 'src/reset.css'
                }
            }
        },
        copy: {
            main: {
                files: [
                    { expand: true, cwd: 'src', src: ['./*'], dest: 'dist', filter: 'isFile' },
                    { expand: true, cwd: 'src/ack', src: ['./*'], dest: 'dist/ack', filter: 'isFile' },
                    { expand: true, cwd: 'src/common', src: ['./*'], dest: 'dist/common', filter: 'isFile' },
                    { expand: true, cwd: 'src/conference', src: ['./*'], dest: 'dist/conference', filter: 'isFile' },
                    { expand: true, cwd: 'src/developer', src: ['./*'], dest: 'dist/developer', filter: 'isFile' },
                    { expand: true, cwd: 'src/docs/paper/edi40_2020', src: ['./*'], dest: 'dist/docs/paper/edi40_2020', filter: 'isFile' },
                    { expand: true, cwd: 'src/edi40', src: ['./*'], dest: 'dist/edi40', filter: 'isFile' },
                    { expand: true, cwd: 'src/edi40-2023/data', src: ['./*'], dest: 'dist/edi40-2023/data', filter: 'isFile' },
                    { expand: true, cwd: 'src/edi40/2024', src: ['./*'], dest: 'dist/edi40/2024', filter: 'isFile' },
                    { expand: true, cwd: 'src/graph', src: ['./*'], dest: 'dist/graph', filter: 'isFile' },
                    { expand: true, cwd: 'src/arch', src: ['./*'], dest: 'dist/arch', filter: 'isFile' },
                    { expand: true, cwd: 'src/img', src: ['./*'], dest: 'dist/img', filter: 'isFile' },
                    { expand: true, cwd: 'src/lib', src: ['./*'], dest: 'dist/lib', filter: 'isFile' },
                    { expand: true, cwd: 'src/research', src: ['./*'], dest: 'dist/research', filter: 'isFile' }
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