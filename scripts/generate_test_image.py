import os
from PIL import Image, ImageDraw

def main():
    # Create a 400x200 white image
    img = Image.new('RGB', (400, 200), color='white')
    d = ImageDraw.Draw(img)

    # Draw text (if default font doesn't support Chinese, draw simple characters or numbers)
    # Tesseract chip will try chi_sim+eng.
    # Let's draw English/Unicode characters or numbers that represent the receipt
    d.text((20, 20), "RECEIPT", fill='black')
    d.text((20, 60), "Total: CNY 68.00", fill='black')
    d.text((20, 100), "Store: Test Merchant", fill='black')
    d.text((20, 140), "Date: 2026-05-23", fill='black')

    # Ensure directory exists
    os.makedirs('scripts', exist_ok=True)
    img.save('scripts/test-receipt.jpg')
    print("Generated scripts/test-receipt.jpg successfully.")

if __name__ == '__main__':
    main()
