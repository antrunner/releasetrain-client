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
                'dist/index.html': 'src/index.html'
            }
        }
    },
    copy: {
      main: {
        files: [
          {expand: true, cwd: 'src/lib', src: ['./*'], dest: 'dist/lib', filter: 'isFile'},
        ],
      },
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify-es');
  grunt.loadNpmTasks('grunt-minify-html');
  grunt.loadNpmTasks('grunt-contrib-copy');
  
  // Default task(s).
  grunt.registerTask('default', ['uglify', 'minifyHtml','copy']);
};