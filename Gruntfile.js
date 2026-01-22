module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    // Компиляция Less в CSS
    less: {
      development: {
        files: {
          'src/css/style.css': 'src/less/style.less'  // Компилирует главный файл
        },
        options: {
          paths: ['src/less']  // Указываем путь к папке с less файлами
        }
      }
    },
    
    // Минификация CSS
    cssmin: {
      target: {
        files: {
          'dist/style.min.css': ['src/css/*.css']
        }
      }
    },
    
    // Минификация JavaScript
    uglify: {
      build: {
        files: {
          'dist/main.min.js': [
            'src/js/script.js',
            'src/js/cart.js',
            'src/js/auth.js'
          ]
        }
      }
    },
    
    // Копирование файлов
    copy: {
      html: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['*.html'],
            dest: 'dist/'
          }
        ]
      },
      images: {
        files: [{
          expand: true,
          cwd: 'src/images/',
          src: ['**/*'],
          dest: 'dist/images/'
        }]
      },
      data: {
        files: [{
          expand: true,
          cwd: 'src/data/',
          src: ['**/*.json'],
          dest: 'dist/data/'
        }]
      }
    },
    
    // Локальный сервер
    connect: {
      server: {
        options: {
          port: 8000,
          base: 'dist',
          livereload: true
        }
      }
    },
    
    // Отслеживание изменений
    watch: {
      less: {
        files: ['src/less/**/*.less'],  // Отслеживает все less файлы
        tasks: ['less', 'cssmin']
      },
      css: {
        files: ['src/css/*.css'],
        tasks: ['cssmin']
      },
      js: {
        files: ['src/js/*.js'],
        tasks: ['uglify']
      },
      html: {
        files: ['src/*.html'],
        tasks: ['copy:html']
      },
      images: {
        files: ['src/images/**/*'],
        tasks: ['copy:images']
      },
      data: {
        files: ['src/data/**/*.json'],
        tasks: ['copy:data']
      }
    }
  });

  // Загрузка плагинов
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Задачи
  grunt.registerTask('build', ['less', 'cssmin', 'uglify', 'copy']);
  grunt.registerTask('dev', ['build', 'connect', 'watch']);
  grunt.registerTask('default', ['build']);
};