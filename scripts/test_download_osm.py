"""Check that failed downloads never replace an existing valid PBF."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


@unittest.skipIf(os.name == 'nt', 'Runs in the Ubuntu Actions runner')
class DownloadSafety(unittest.TestCase):
    def run_download(self, always_fail=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'existing.pbf'
            target.write_text('existing-data')
            scripts = {
                'timeout': '#!/bin/sh\nshift 3\nexec "$@"\n',
                'osmium': '#!/bin/sh\nexit 0\n',
                'aria2c': '''#!/bin/sh
dir=; out=; url=
for arg in "$@"; do
  case "$arg" in --dir=*) dir=${arg#--dir=};; --out=*) out=${arg#--out=};; https:*) url=$arg;; esac
done
printf 'partial-data' > "$dir/$out"
if [ "$FAIL_ALL" = 1 ] || echo "$url" | grep -q geofabrik; then exit 1; fi
printf 'new-valid-data' > "$dir/$out"
''',
            }
            for name, body in scripts.items():
                file = root / name
                file.write_text(body)
                file.chmod(0o755)
            helper = Path(__file__).with_name('download-osm.sh').resolve()
            result = subprocess.run(['bash', '-c', 'source "$1"; download france "$2"', 'test', str(helper), str(target)],
                                    env={**os.environ, 'PATH': str(root) + os.pathsep + os.environ['PATH'], 'FAIL_ALL': '1' if always_fail else '0'},
                                    capture_output=True, text=True, timeout=10)
            return result.returncode, target.read_text(), (root / 'existing.pbf.download').exists()

    def test_failed_sources_preserve_existing_file(self):
        code, content, temporary = self.run_download(always_fail=True)
        self.assertNotEqual(code, 0)
        self.assertEqual(content, 'existing-data')
        self.assertFalse(temporary)

    def test_second_mirror_replaces_file_only_after_success(self):
        code, content, temporary = self.run_download()
        self.assertEqual(code, 0)
        self.assertEqual(content, 'new-valid-data')
        self.assertFalse(temporary)
