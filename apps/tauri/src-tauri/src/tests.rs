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
fn encoded_path_arg_round_trips() {
    let path = r"C:\Users\O'Brien\My Docs\運用手順 `v2`.md";
    let arg = encode_path_arg(path);
    assert!(
        !arg.contains([' ', '"', '\'', '`', '/', '\\']),
        "no characters NSIS splits or unquotes on: {arg}"
    );
    assert_eq!(decode_path_arg(&arg).as_deref(), Some(path));
    assert_eq!(decode_path_arg("--open-hex=6"), None, "odd length");
    assert_eq!(decode_path_arg("--open-hex=zz"), None, "not hex");
    assert_eq!(decode_path_arg("notes.md"), None, "no prefix");
}

#[test]
fn relaunch_args_encode_markdown_paths_absolute() {
    let cwd = std::env::temp_dir().join("launch");
    let absolute = cwd.join("my notes.md").to_string_lossy().to_string();
    let args: Vec<OsString> = ["mark-bricks", "--flag", "a.md", "image.png"]
        .map(OsString::from)
        .into();
    let got = relaunch_args(args, &cwd);
    assert_eq!(
        got,
        [
            OsString::from("mark-bricks"),
            OsString::from("--flag"),
            OsString::from(encode_path_arg(&cwd.join("a.md").to_string_lossy())),
            OsString::from("image.png"),
        ],
        "only Markdown paths are rewritten"
    );

    // The relaunched process opens the same file, whatever its directory,
    // and re-encodes it unchanged for the next relaunch.
    let relaunched = [
        OsString::from("mark-bricks"),
        encode_path_arg(&absolute).into(),
    ];
    let elsewhere = std::env::temp_dir().join("install");
    assert_eq!(
        collect_markdown_paths(relaunched.iter().map(|a| a.to_str().unwrap()), &elsewhere),
        [absolute]
    );
    assert_eq!(relaunch_args(relaunched.to_vec(), &elsewhere), relaunched);
}

#[test]
fn collect_markdown_paths_rejects_bad_encoded_paths() {
    let cwd = std::env::temp_dir();
    let argv = [
        "mark-bricks".to_string(),
        encode_path_arg("relative.md"),
        encode_path_arg(&cwd.join("image.png").to_string_lossy()),
    ];
    assert!(collect_markdown_paths(argv.iter(), &cwd).is_empty());
}
