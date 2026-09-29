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

#[test]
fn relaunch_args_drop_markdown_paths() {
    let args: Vec<OsString> = [
        "mark-bricks",
        "--flag",
        r"C:\Test Directory\a.md",
        "image.png",
    ]
    .map(OsString::from)
    .into();
    assert_eq!(
        relaunch_args(args),
        ["mark-bricks", "--flag", "image.png"].map(OsString::from),
        "Markdown paths go through the relaunch file instead"
    );
}

#[test]
fn relaunch_documents_are_restored_once() {
    let file = std::env::temp_dir()
        .join(format!("mark-bricks-relaunch-{}", std::process::id()))
        .join(RELAUNCH_DOCUMENTS_FILE);
    let paths = [r"C:\Test Directory\a.md", "/Users/me/運用手順 b.md"].map(String::from);
    write_relaunch_documents(&file, &paths).unwrap();
    assert_eq!(take_relaunch_documents(&file), paths);
    assert!(take_relaunch_documents(&file).is_empty(), "taken only once");

    write_relaunch_documents(&file, &paths).unwrap();
    write_relaunch_documents(&file, &[]).unwrap();
    assert!(!file.exists(), "an empty list clears saved paths");
    write_relaunch_documents(&file, &[]).unwrap();

    std::fs::remove_dir(file.parent().unwrap()).unwrap();
}
