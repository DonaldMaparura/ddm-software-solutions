/* ============================================================
   Blu Saffron — dynamic menu
   Renders categories, item cards and filter pills from data.
   Prices in ZAR (R). Source: official Blu Saffron menu.
   ============================================================ */
(function () {
  "use strict";

  var IMG = "assets/img/";

  var MENU = [
    {
      id: "starters",
      name: "Starters",
      blurb: "Something to begin — boards, classics and small plates.",
      items: [
        { name: "Beef or Smoked Kudu Carpaccio", img: "charcuterie.jpg", price: "R109",
          desc: "Fresh rocket, parmesan shavings and spring onion." },
        { name: "Prawn Tempura", price: "R142", desc: "Crispy prawns with a selection of dipping sauces." },
        { name: "Beef Tartare", price: "R138", tag: "A classic", desc: "Hand-prepared beef tartare, the classic way." },
        { name: "Avocado Ritz", price: "R137", desc: "A retro favourite, beautifully done." },
        { name: "Duck Liver Pâté (French) Brûlée", price: "R119",
          desc: "Served with preserve fig, marula jelly and toast." },
        { name: "Trinchado", price: "R109", desc: "Cubed beef fillet in a spicy cream sauce with feta and olives." },
        { name: "Calamari", price: "R99", desc: "Deep-fried in a light batter, with tartare sauce." },
        { name: "Fish Cakes", price: "R99", desc: "Homemade Thai-style cakes with sweet chilli sauce." },
        { name: "Snails", price: "R89 / R99",
          desc: "Garlic butter; or garlic, cream & cheddar / blue cheese & garlic." },
        { name: "Chicken Livers", price: "R86", desc: "Pan-fried in a mild peri-peri sauce." },
        { name: "Roquefort & Preserved Fig Balls", price: "R85",
          desc: "Rolled in Japanese bread crumbs with a shiraz reduction." },
        { name: "Crumbed Mushrooms", price: "R85",
          desc: "Sundried tomatoes, peppadews, Danish feta and tartare sauce." }
      ]
    },
    {
      id: "soups",
      name: "Soups",
      blurb: "Warm, homemade and comforting.",
      items: [
        { name: "Biltong & Mushroom Cream Soup", price: "R87", desc: "A rich South African favourite." },
        { name: "Homemade Tomato & Basil Soup", price: "R80", desc: "Fresh and full of flavour." }
      ]
    },
    {
      id: "salads",
      name: "Salads",
      blurb: "Fresh, vibrant and generously plated.",
      items: [
        { name: "2 Cheese", img: "salad-artichoke.jpg", price: "R129", tag: "Signature",
          desc: "Roquefort and deep-fried feta on rocket with sundried tomatoes and strawberries (vinaigrette)." },
        { name: "Biltong Salad", price: "R139",
          desc: "French salad topped with thinly sliced biltong, Danish feta, balsamic reduction and olive oil." },
        { name: "Pineapple Salad", price: "R119",
          desc: "Traditional French salad, pineapple, peppadew, deep-fried Danish feta, vinaigrette and balsamic." },
        { name: "Caprese", price: "R89", tag: "Vegetarian",
          desc: "Sliced mozzarella, onion and tomato with basil and a balsamic reduction." }
      ]
    },
    {
      id: "poultry",
      name: "Poultry",
      blurb: "Free-range favourites and fragrant curries.",
      items: [
        { name: "Thai Chicken Curry", img: "curry-rice.jpg", price: "R179", tag: "Signature",
          desc: "Fragrant Thai curry served with rice." },
        { name: "Duck", price: "R245", desc: "Deboned crispy duck, topped with a clear orange sauce." },
        { name: "Chicken Schnitzel", price: "R179 / R189",
          desc: "Choice of cheese or wild mushroom sauce; or melted Emmental, capers and roasted cherry tomatoes." }
      ]
    },
    {
      id: "meat",
      name: "Meat & Grills",
      blurb: "Flame-grilled steaks and game — all mains served with a side of your choice.",
      items: [
        { name: "Kudu Fillet", img: "steak-salad.jpg", price: "R269", tag: "Game",
          desc: "Medium-rare, sliced and served with a raspberry and basil jus." },
        { name: "Sirloin (400g)", img: "steak-chips.jpg", price: "R259", desc: "Flame-grilled to your liking." },
        { name: "Beef Stroganoff", price: "R245", desc: "Sliced fillet with peppers in a creamy paprika sauce." },
        { name: "Fillet Bali", price: "R245", desc: "Fillet with a sambal oelek kick." },
        { name: "Blu Rump", price: "R229", tag: "Signature",
          desc: "Flame-grilled, topped with roquefort and served with blue cheese sauce." },
        { name: "Hunters Schnitzel (Beef)", price: "R225",
          desc: "With a chicken liver and Madagascan peppercorn sherry sauce." },
        { name: "Game Schnitzel (Kudu)", price: "R225", tag: "Game",
          desc: "Topped with a wild mushroom and cranberry cream sauce." },
        { name: "Fillet", price: "R220", desc: "Flame-grilled." },
        { name: "Rump", price: "R189", desc: "Flame-grilled." },
        { name: "Sides", price: "R30 / R32",
          desc: "Herb salad, caprese stack or Greek salad (R30) · chips, pan-fried potatoes, croquettes, rice, mash or veg of the day (R32)." },
        { name: "Sauces", price: "R20 / R32",
          desc: "Pepper, wild mushroom, cheese, Dijon, blue cheese, garlic cream, Monkey Gland (R32) · fresh garlic, chillies or peri-peri (R20)." }
      ]
    },
    {
      id: "fish",
      name: "Fish & Seafood",
      blurb: "The day's freshest, simply and beautifully done.",
      items: [
        { name: "Fresh Kingklip Fillet", img: "fish.jpg", price: "R245", tag: "Chef's choice",
          desc: "Mediterranean lemon butter, fresh basil and sundried tomato sauce." },
        { name: "Prawns", price: "R355", desc: "Served with rice." },
        { name: "Fresh Fish of the Day", price: "R225 / R245",
          desc: "Deboned and grilled. Lemon butter (R225) or chef's speciality sauce (R245)." },
        { name: "Sole", price: "R245", desc: "Grilled with lemon butter." },
        { name: "Asian Seafood Curry", price: "R245",
          desc: "Red Thai curry with fish, calamari, prawns and mussels, served with rice." },
        { name: "Calamari", price: "R199", desc: "Deep-fried or grilled, with tartare." }
      ]
    },
    {
      id: "encore",
      name: "Encore — Desserts",
      blurb: "A sweet finish to linger over.",
      items: [
        { name: "Ferrero Rocher Mousse", img: "dessert.jpg", price: "R89", tag: "Signature",
          desc: "Served with berry jus and fresh seasonal berries." },
        { name: "Cheese Platter for Two", price: "R185", desc: "Biscuits, preserves, fruit and port." },
        { name: "Homemade Italian Gelato", price: "R86", desc: "Rich, house-made ice cream." },
        { name: "Cheese Cake", price: "R79", desc: "Classic and creamy." },
        { name: "Crème Brûlée", price: "R79", tag: "A classic", desc: "A great classic." },
        { name: "Duo of Italian Gelato Sorbet", price: "R79", desc: "Homemade sorbet duo." },
        { name: "Vanilla Ice Cream & Hot Chocolate", price: "R74", desc: "Vanilla ice cream with hot chocolate sauce." }
      ]
    },
    {
      id: "gin-bar",
      name: "Gin Garden & Bar",
      blurb: "Sip in the garden — gins, cocktails and fine wines. Ask for our full drinks list.",
      items: [
        { name: "Signature Gin & Tonic", img: "gin-cocktail.jpg", tag: "Garden favourite",
          desc: "Premium gin, blue tonic, fresh berries and rosemary, served over ice." },
        { name: "Gin Selection", img: "gin-golf.jpg",
          desc: "A curated range of premium and garden-reserve gins." },
        { name: "Classic Cocktails", img: "cocktails.jpg",
          desc: "Piña colada, mojito, cosmopolitan and more, mixed to order." },
        { name: "Wines by the Glass", img: "wine-glasses.jpg",
          desc: "A curated South African wine list — ask for today's pours." }
      ]
    }
  ];

  var root = document.getElementById("menu-root");
  var filterWrap = document.getElementById("menu-filter");
  if (!root) return;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function cardMarkup(item) {
    var media = item.img
      ? '<div class="mcard__media"><img src="' + IMG + item.img + '" alt="' + item.name +
        '" loading="lazy" width="256" height="256" /></div>'
      : "";
    var tag = item.tag ? '<span class="mtag">' + item.tag + "</span>" : "";
    var price = item.price ? '<span class="mcard__price">' + item.price + "</span>" : "";
    return (
      media +
      '<div class="mcard__body">' +
        '<div class="mcard__top"><span class="mcard__name">' + item.name + tag + "</span>" + price + "</div>" +
        '<p class="mcard__desc">' + item.desc + "</p>" +
      "</div>"
    );
  }

  // Build category sections
  MENU.forEach(function (cat) {
    var section = el("div", "menu-cat");
    section.id = cat.id;
    section.setAttribute("data-cat", cat.id);

    var head = el("div", "menu-cat__head");
    head.appendChild(el("h2", null, cat.name));
    head.appendChild(el("span", "line"));
    section.appendChild(head);

    if (cat.blurb) {
      var blurb = el("p", "lead", cat.blurb);
      blurb.style.marginTop = "-10px";
      blurb.style.marginBottom = "22px";
      section.appendChild(blurb);
    }

    var grid = el("div", "menu-cards");
    cat.items.forEach(function (item) {
      var card = el("article", "mcard reveal is-in" + (item.img ? "" : " mcard--noimg"));
      card.innerHTML = cardMarkup(item);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    root.appendChild(section);
  });

  // Build filter pills
  if (filterWrap) {
    var pills = [{ id: "all", name: "All" }].concat(
      MENU.map(function (c) { return { id: c.id, name: c.name }; })
    );
    pills.forEach(function (p, i) {
      var b = el("button", "menu-pill" + (i === 0 ? " is-active" : ""), p.name);
      b.type = "button";
      b.setAttribute("data-filter", p.id);
      b.addEventListener("click", function () {
        filterWrap.querySelectorAll(".menu-pill").forEach(function (x) {
          x.classList.remove("is-active");
        });
        b.classList.add("is-active");
        applyFilter(p.id);
      });
      filterWrap.appendChild(b);
    });
  }

  function applyFilter(id) {
    root.querySelectorAll(".menu-cat").forEach(function (sec) {
      var show = id === "all" || sec.getAttribute("data-cat") === id;
      sec.classList.toggle("is-hidden", !show);
    });
  }
})();
