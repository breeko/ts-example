var gulp = require("gulp");
var ts = require("gulp-typescript");

gulp.task("default", function () {
    var tsResult = gulp.src("src/*.ts")
        .pipe(ts({
              module: "amd",
              noImplicitAny: false,
              out: "app.js"
        }));
    return tsResult.js.pipe(gulp.dest("dist"));
});
