exports.config =
  # See http://brunch.io/#documentation for docs.
  files:
    javascripts:
      joinTo: 'color-sparks.js'
      order:
        before: 'app/console-polyfill.js'

  modules:
    definition: false
    wrapper: false

  conventions:
    ignored: /jaded-brunch/


  paths:
    public: "debug"

  overrides:
    production:
      sourceMaps: true
      paths:
        public: "dist"
