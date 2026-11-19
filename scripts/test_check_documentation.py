import unittest

from check_documentation import markdown_destinations


class MarkdownDestinationsTest(unittest.TestCase):
    def test_links_images_titles_and_references(self):
        content = '[Guide](docs/guide.md "Title") ![Figure](figure.png)\n[ref]: other.md "Title"'
        self.assertEqual(markdown_destinations(content), ['docs/guide.md', 'figure.png', 'other.md'])

    def test_angle_brackets_preserve_spaces(self):
        self.assertEqual(markdown_destinations('[Report](<docs/My Report.md>)'), ['docs/My Report.md'])

    def test_many_unclosed_links_do_not_backtrack(self):
        self.assertEqual(markdown_destinations('](' * 100000), [])


if __name__ == '__main__':
    unittest.main()
