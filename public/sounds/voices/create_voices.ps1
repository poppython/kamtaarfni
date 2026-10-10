$mp3Header = [byte[]] @(0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00)
$silence = [byte[]] @(0x00) * 1000
$files = @('wrong1.mp3','wrong2.mp3','wrong3.mp3','correct1.mp3','correct2.mp3','correct3.mp3','low1.mp3','high1.mp3')
foreach ($f in $files) {
    [System.IO.File]::WriteAllBytes($f, $mp3Header + $silence)
}
echo 'Created voice placeholder files'