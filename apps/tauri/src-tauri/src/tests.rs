use super::*;

#[test]
fn is_markdown_path_classifies_arguments() {
    // (argument, expected, what the case demonstrates)
    let cases = [
        ("notes.md", true, "configured extension"),
        ("README.markdown", true, "second configured extension"),
        ("NOTES.MD", true, "extension matched case-insensitively"),
        ("Readme.MarkDown", true, "mixed-case extension"),
        (
            "/home/user/docs/notes.md",
            true,
            "extension within a nested path",
        ),
        ("photo.png", false, "unconfigured extension"),
        ("archive.tar.gz", false, "unconfigured compound extension"),
        ("Makefile", false, "no extension"),
        // A leading "-" marks a CLI flag, never a file to open — even when the
        // rest happens to end in a Markdown extension.
        ("-h", false, "leading-dash flag"),
        ("--config.md", false, "flag ending in a Markdown extension"),
    ];
    for (arg, expected, desc) in cases {
        assert_eq!(
            is_markdown_path(arg),
            expected,
            "{desc}: is_markdown_path({arg:?})"
        );
    }
}

#[test]
fn collect_markdown_paths_selects_files_from_args() {
    // (argv, expected opened files, what the case demonstrates). The first argv
    // entry is the program's own path and is never opened.
    let cases: [(&[&str], &[&str], &str); 4] = [
        (
            &["mark-bricks", "notes.md"],
            &["notes.md"],
            "keeps a Markdown file, drops the program name",
        ),
        (
            &["/opt/app/first.md", "second.md"],
            &["second.md"],
            "skips the first arg even when it is Markdown",
        ),
        (
            &["mark-bricks", "--flag", "image.png", "a.md", "b.markdown"],
            &["a.md", "b.markdown"],
            "drops flags and non-Markdown files, preserves order",
        ),
        (&["mark-bricks"], &[], "no files yields an empty list"),
    ];
    let cwd = std::env::temp_dir();
    for (argv, expected, desc) in cases {
        let got = collect_markdown_paths(argv.iter().copied(), &cwd);
        let expected: Vec<String> = expected
            .iter()
            .map(|s| cwd.join(s).to_string_lossy().to_string())
            .collect();
        assert_eq!(got, expected, "{desc}: argv={argv:?}");
    }
}

#[test]
fn collect_markdown_paths_makes_paths_absolute() {
    let cwd = std::env::temp_dir().join("launch");
    let other = std::env::temp_dir().join("other").join("c.md");
    let other = other.to_string_lossy().to_string();
    let argv = ["mark-bricks", "./docs/a.md", "../b.md", other.as_str()];
    let got = collect_markdown_paths(argv.iter().copied(), &cwd);
    let expected = [
        cwd.join("docs").join("a.md"),
        std::env::temp_dir().join("b.md"),
    ]
    .map(|p| p.to_string_lossy().to_string());
    assert_eq!(
        got,
        [expected[0].clone(), expected[1].clone(), other.clone()],
        "relative paths join the launch directory, absolute ones stay"
    );
}

/// Builds a unique temp path per call site so parallel tests don't collide.
fn temp_path(tag: &str) -> String {
    let mut path = std::env::temp_dir();
    path.push(format!("mark-bricks-{}-{}.md", tag, std::process::id()));
    path.to_string_lossy().to_string()
}

#[test]
fn write_then_read_round_trips_contents() {
    let path = temp_path("roundtrip");
    let contents = "# Title\n\nbody text\n";

    write_text_file(path.clone(), contents.to_string()).unwrap();
    let read_back = read_text_file(path.clone()).unwrap();
    assert_eq!(read_back, contents);

    let _ = std::fs::remove_file(&path);
}

#[test]
fn read_text_file_errors_on_missing_file() {
    let path = temp_path("missing");
    let _ = std::fs::remove_file(&path);
    assert!(read_text_file(path).is_err());
}
