"""Render a plain-text cover-letter .md (paragraphs separated by blank lines)
to matching .docx and .pdf files next to it.

Usage: python scripts/build_cover_letter.py <path/to/cover-letter.md>
"""
import sys
from pathlib import Path

from docx import Document
from docx.shared import Pt, Inches
from fpdf import FPDF

WIN_FONTS = Path("C:/Windows/Fonts")
SImap = {
    "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'",
    "\u201c": '"', "\u201d": '"', "\u2026": "...",
}


def ascii_pdf(s: str) -> str:
    for k, v in SImap.items():
        s = s.replace(k, v)
    return s.encode("latin-1", "ignore").decode("latin-1")


def build_docx(paras, out: Path):
    d = Document()
    st = d.styles["Normal"].font
    st.name = "Calibri"
    st.size = Pt(11)
    for s in d.sections:
        s.top_margin = s.bottom_margin = Inches(0.9)
        s.left_margin = s.right_margin = Inches(1.0)
    for p in paras:
        para = d.add_paragraph(p)
        para.paragraph_format.space_after = Pt(10)
    d.save(str(out))


def build_pdf(paras, out: Path):
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(25, 22, 25)
    pdf.add_page()
    try:
        pdf.add_font("Arial", "", str(WIN_FONTS / "arial.ttf"))
        fam = "Arial"
    except Exception:
        fam = "Helvetica"
    pdf.set_font(fam, "", 11)
    W = pdf.w - pdf.l_margin - pdf.r_margin
    for p in paras:
        pdf.multi_cell(W, 6, ascii_pdf(p))
        pdf.ln(4)
    pdf.output(str(out))


def main():
    if len(sys.argv) != 2:
        print("usage: python build_cover_letter.py <cover-letter.md>")
        return 1
    src = Path(sys.argv[1])
    text = src.read_text(encoding="utf-8")
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    stem = src.with_suffix("")
    build_docx(paras, stem.with_suffix(".docx"))
    build_pdf(paras, stem.with_suffix(".pdf"))
    print("built:", stem.with_suffix(".docx"), "+ .pdf")


if __name__ == "__main__":
    sys.exit(main())
