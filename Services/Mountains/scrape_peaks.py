from playwright.sync_api import sync_playwright

URL = "https://climb4kc.org/peaks"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto(URL, wait_until="networkidle")

    cards = page.locator("li.user-items-list-carousel__slide.list-item")
    print("Found cards:", cards.count())

    for i in range(min(3, cards.count())):
        card = cards.nth(i)

        print(f"\n===== CARD {i+1} =====")
        print("\n[TEXT]")
        print(card.inner_text())

        try:
            img = card.locator("img.user-items-list-carousel__media").first
            image_url = (
                img.get_attribute("src")
                or img.get_attribute("data-src")
                or img.get_attribute("data-image")
            )
            print("\n[IMAGE URL]")
            print(image_url)
        except Exception as e:
            print("\n[IMAGE URL]")
            print("None", e)

    browser.close()