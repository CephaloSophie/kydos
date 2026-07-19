/* @ds-bundle: {"format":3,"namespace":"ContrEDesignSystem_9c78ea","components":[{"name":"AnnouncePopup","sourcePath":"components/bidding/AnnouncePopup.jsx"},{"name":"AnnounceStream","sourcePath":"components/bidding/AnnounceStream.jsx"},{"name":"BidBadge","sourcePath":"components/bidding/BidBadge.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"ControlBar","sourcePath":"components/devtools/ControlBar.jsx"},{"name":"LogConsole","sourcePath":"components/devtools/LogConsole.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"RecapTable","sourcePath":"components/score/RecapTable.jsx"},{"name":"ScoreBoard","sourcePath":"components/score/ScoreBoard.jsx"},{"name":"TeamBadge","sourcePath":"components/score/TeamBadge.jsx"},{"name":"PlayingCard","sourcePath":"components/table/PlayingCard.jsx"},{"name":"TableFelt","sourcePath":"components/table/TableFelt.jsx"}],"sourceHashes":{"components/bidding/AnnouncePopup.jsx":"4e9ef9e2a2d4","components/bidding/AnnounceStream.jsx":"86f773eb1692","components/bidding/BidBadge.jsx":"24641639ab05","components/core/Badge.jsx":"973519252839","components/core/Button.jsx":"f7a9a4365450","components/core/Card.jsx":"712f2d713be4","components/core/IconButton.jsx":"cfcf17acbb28","components/core/Tag.jsx":"86f16257ee1b","components/devtools/ControlBar.jsx":"0f4a21183684","components/devtools/LogConsole.jsx":"768596877258","components/feedback/Dialog.jsx":"b524ab370e2b","components/feedback/Toast.jsx":"f343d6bbcc22","components/feedback/Tooltip.jsx":"72907bbb7ac1","components/forms/Input.jsx":"c701511b2e03","components/forms/Select.jsx":"931614ccaed3","components/forms/Slider.jsx":"4dec1ab42442","components/forms/Switch.jsx":"4edfb0873eca","components/score/RecapTable.jsx":"4203f982ee24","components/score/ScoreBoard.jsx":"279dd331ead4","components/score/TeamBadge.jsx":"2f14c214f100","components/table/PlayingCard.jsx":"bd3b14eaf23f","components/table/TableFelt.jsx":"d80318bce5e4","ui_kits/mobile/app.js":"4a0406eedea6","ui_kits/web/GameScreen.jsx":"f33aa4777443","ui_kits/web/LobbyScreen.jsx":"aa05214f0aef","ui_kits/web/RobotsScreen.jsx":"c1d0778e01cc","ui_kits/web/TournamentScreen.jsx":"ea83c65bdc20","ui_kits/web/app.jsx":"204d5f0c4abd","ui_kits/web/icons.jsx":"d6c16285da24"},"inlinedExternals":[],"unexposedExports":[{"name":"teamColor","sourcePath":"components/score/TeamBadge.jsx"}]} */

(() => {

const __ds_ns = (window.ContrEDesignSystem_9c78ea = window.ContrEDesignSystem_9c78ea || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/bidding/BidBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SUIT = {
  hearts: "♥",
  diamonds: "♦",
  spades: "♠",
  clubs: "♣",
  sa: "SA",
  ta: "TA",
  null: ""
};

/**
 * BidBadge — annonce d'enchère : passe / contrat chiffré / contré / surcontré.
 * Coloré par équipe via --team-* ; le contre/surcontre garde sa teinte d'alerte.
 */
function BidBadge({
  kind = "bid",
  value,
  suit,
  team,
  size = "md",
  animate = false,
  style,
  ...rest
}) {
  const palettes = {
    pass: {
      bg: "var(--bid-pass-bg)",
      fg: "var(--bid-pass-fg)",
      line: "var(--border-2)"
    },
    bid: {
      bg: "var(--bid-bid-bg)",
      fg: "var(--bid-bid-fg)",
      line: "var(--accent-line)"
    },
    contre: {
      bg: "var(--bid-contre-bg)",
      fg: "var(--bid-contre-fg)",
      line: "var(--bid-contre-fg)"
    },
    surcontre: {
      bg: "var(--bid-surcontre-bg)",
      fg: "var(--bid-surcontre-fg)",
      line: "var(--bid-surcontre-fg)"
    }
  };
  // si une équipe est fournie pour un "bid", on relaie sa couleur
  const teamTint = team && kind === "bid" ? {
    bg: `var(--team-${team}-soft)`,
    fg: `var(--team-${team})`,
    line: `var(--team-${team}-line)`
  } : null;
  const p = teamTint || palettes[kind] || palettes.bid;
  const dims = size === "sm" ? {
    h: 22,
    fs: "var(--fs-xs)",
    px: 9
  } : size === "lg" ? {
    h: 34,
    fs: "var(--fs-h3)",
    px: 14
  } : {
    h: 27,
    fs: "var(--fs-sm)",
    px: 11
  };
  const isRed = suit === "hearts" || suit === "diamonds";
  const label = kind === "pass" ? "Passe" : kind === "contre" ? "Contré" : kind === "surcontre" ? "Surcontré" : `${value ?? ""}`;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: animate ? "anim-bid" : undefined,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: dims.h,
      padding: `0 ${dims.px}px`,
      borderRadius: "var(--r-full)",
      background: p.bg,
      color: p.fg,
      border: `1px solid ${p.line}`,
      fontFamily: "var(--font-display)",
      fontSize: dims.fs,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), label, kind === "bid" && suit && /*#__PURE__*/React.createElement("span", {
    style: {
      color: isRed ? "var(--card-red)" : "inherit",
      fontSize: "1.1em"
    }
  }, SUIT[suit] ?? suit));
}
Object.assign(__ds_scope, { BidBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/bidding/BidBadge.jsx", error: String((e && e.message) || e) }); }

// components/bidding/AnnouncePopup.jsx
try { (() => {
const SUIT = {
  hearts: "♥",
  diamonds: "♦",
  spades: "♠",
  clubs: "♣",
  sa: "SA",
  ta: "TA"
};

/**
 * AnnouncePopup — popup auto-disparaissante en haut du tapis : preneur, atout,
 * contrat, et éventuel contre/surcontre. Slide-down + fade-out automatique.
 * Purement présentation : ne pilote jamais l'état du moteur.
 */
function AnnouncePopup({
  taker,
  team = "a",
  atout,
  contract,
  kind = "bid",
  visible = true
}) {
  if (!visible) return null;
  const isRed = atout === "hearts" || atout === "diamonds";
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "anim-announce",
    style: {
      position: "absolute",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "var(--z-announce)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 18px",
      background: "rgba(14,18,24,.92)",
      backdropFilter: "blur(10px)",
      border: `1px solid var(--team-${team}-line)`,
      borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-pop)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      alignSelf: "stretch",
      borderRadius: "var(--r-full)",
      background: `var(--team-${team})`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-xs)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-3)"
    }
  }, "Preneur"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: "var(--fs-h3)"
    }
  }, taker)), contract && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      paddingLeft: 14,
      borderLeft: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--fs-h2)",
      color: "var(--text-1)"
    }
  }, contract), atout && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26,
      color: isRed ? "var(--card-red)" : "var(--text-1)"
    }
  }, SUIT[atout] ?? atout)), (kind === "contre" || kind === "surcontre") && /*#__PURE__*/React.createElement(__ds_scope.BidBadge, {
    kind: kind,
    size: "md"
  }));
}
Object.assign(__ds_scope, { AnnouncePopup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/bidding/AnnouncePopup.jsx", error: String((e && e.message) || e) }); }

// components/bidding/AnnounceStream.jsx
try { (() => {
/**
 * AnnounceStream — flux d'enchères chronologique, coloré par équipe.
 * Sert pendant les enchères et comme historique de partie. Scrolle en interne.
 */
function AnnounceStream({
  entries = [],
  title = "Flux d'enchères"
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      minHeight: 0,
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      borderBottom: "1px solid var(--border-1)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: "var(--fs-body)"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "var(--text-3)"
    }
  }, entries.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: "auto",
      minHeight: 0,
      padding: "8px 6px"
    }
  }, entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      gap: 10,
      padding: "7px 8px",
      borderRadius: "var(--r-sm)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: `var(--team-${e.team || "a"})`,
      justifySelf: "center"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--text-1)",
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, e.player, e.isRobot && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--spark)",
      fontSize: "var(--fs-xs)",
      marginLeft: 5
    }
  }, "BOT")), e.round && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "var(--text-3)"
    }
  }, e.round)), /*#__PURE__*/React.createElement(__ds_scope.BidBadge, {
    kind: e.kind || "bid",
    value: e.value,
    suit: e.suit,
    team: e.team,
    size: "sm"
  })))));
}
Object.assign(__ds_scope, { AnnounceStream });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/bidding/AnnounceStream.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — pastille de statut compacte. tone sémantique, dot optionnel.
 */
function Badge({
  tone = "neutral",
  solid = false,
  dot = false,
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      fg: "var(--text-2)",
      bg: "var(--bg-3)",
      line: "var(--border-2)"
    },
    accent: {
      fg: "var(--accent-strong)",
      bg: "var(--accent-dim)",
      line: "var(--accent-line)"
    },
    success: {
      fg: "var(--success)",
      bg: "var(--success-ghost)",
      line: "var(--success)"
    },
    warning: {
      fg: "var(--warning)",
      bg: "var(--warning-ghost)",
      line: "var(--warning)"
    },
    error: {
      fg: "var(--error)",
      bg: "var(--error-ghost)",
      line: "var(--error)"
    },
    info: {
      fg: "var(--info)",
      bg: "var(--info-ghost)",
      line: "var(--info)"
    },
    spark: {
      fg: "var(--spark)",
      bg: "var(--spark-ghost)",
      line: "var(--spark)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 22,
      padding: "0 9px",
      borderRadius: "var(--r-full)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-xs)",
      fontWeight: "var(--fw-semibold)",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      color: solid ? "var(--text-on-accent)" : t.fg,
      background: solid ? t.fg : t.bg,
      border: solid ? "1px solid transparent" : `1px solid ${t.line}`,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: solid ? "currentColor" : t.fg
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — action primaire de Contrée. Variantes sémantiques, pilote ses
 * couleurs uniquement via tokens (jamais de couleur en dur).
 */
function Button({
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  children,
  style,
  ...rest
}) {
  const heights = {
    sm: "var(--control-h-sm)",
    md: "var(--control-h)",
    lg: "var(--control-h-lg)"
  };
  const pads = {
    sm: "0 12px",
    md: "0 16px",
    lg: "0 22px"
  };
  const fonts = {
    sm: "var(--fs-sm)",
    md: "var(--fs-body)",
    lg: "var(--fs-body)"
  };
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      border: "1px solid transparent"
    },
    secondary: {
      background: "var(--bg-3)",
      color: "var(--text-1)",
      border: "1px solid var(--border-2)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-2)",
      border: "1px solid transparent"
    },
    danger: {
      background: "var(--error)",
      color: "#1a0a0c",
      border: "1px solid transparent"
    },
    spark: {
      background: "var(--spark)",
      color: "#06212c",
      border: "1px solid transparent"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    height: heights[size],
    padding: pads[size],
    width: fullWidth ? "100%" : "auto",
    fontFamily: "var(--font-ui)",
    fontSize: fonts[size],
    fontWeight: "var(--fw-semibold)",
    lineHeight: 1,
    letterSpacing: "0.01em",
    borderRadius: "var(--r-md)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? "var(--disabled-opacity)" : 1,
    transition: "filter var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    userSelect: "none",
    whiteSpace: "nowrap",
    ...variants[variant],
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled || loading,
    "aria-busy": loading || undefined,
    className: "focus-ring",
    style: base,
    onMouseDown: e => {
      if (!disabled && !loading) e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "translateY(0)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.filter = "none";
    },
    onMouseEnter: e => {
      if (!disabled && !loading) e.currentTarget.style.filter = "brightness(1.08)";
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(Spinner, null) : iconLeft, children && /*#__PURE__*/React.createElement("span", null, children), !loading && iconRight);
}
function Spinner() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: "2px solid currentColor",
      borderTopColor: "transparent",
      display: "inline-block",
      animation: "m-ptr-spin 700ms linear infinite"
    }
  });
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — surface posée standard. header/footer optionnels, padding réglable.
 */
function Card({
  as: Tag = "div",
  elevated = false,
  interactive = false,
  padding = "md",
  header = null,
  footer = null,
  children,
  style,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "var(--sp-3)",
    md: "var(--sp-4)",
    lg: "var(--sp-6)"
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      boxShadow: elevated ? "var(--shadow-2)" : "none",
      transition: "border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
      cursor: interactive ? "pointer" : "default",
      overflow: "hidden",
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.borderColor = "var(--border-strong)";
      e.currentTarget.style.transform = "translateY(-2px)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.borderColor = "var(--border-1)";
      e.currentTarget.style.transform = "translateY(0)";
    } : undefined
  }, rest), header && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--sp-3) var(--sp-4)",
      borderBottom: "1px solid var(--border-1)",
      color: "var(--text-1)",
      fontWeight: "var(--fw-semibold)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pads[padding],
      flex: 1,
      minHeight: 0
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--sp-3) var(--sp-4)",
      borderTop: "1px solid var(--border-1)"
    }
  }, footer));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — bouton carré pour une seule icône. Exige un aria-label.
 */
function IconButton({
  variant = "ghost",
  size = "md",
  label,
  active = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const dims = {
    sm: "var(--control-h-sm)",
    md: "var(--control-h)",
    lg: "var(--control-h-lg)"
  };
  const variants = {
    ghost: {
      background: active ? "var(--accent-ghost)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-2)",
      border: "1px solid transparent"
    },
    solid: {
      background: "var(--bg-3)",
      color: "var(--text-1)",
      border: "1px solid var(--border-2)"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      border: "1px solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    "aria-pressed": active || undefined,
    title: label,
    disabled: disabled,
    className: "focus-ring",
    style: {
      display: "inline-grid",
      placeItems: "center",
      width: dims[size],
      height: dims[size],
      padding: 0,
      borderRadius: "var(--r-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? "var(--disabled-opacity)" : 1,
      transition: "background var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)",
      ...variants[variant],
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(1.12)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = "none";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — étiquette filtre/attribut, optionnellement sélectionnable ou retirable.
 */
function Tag({
  selected = false,
  onRemove,
  children,
  style,
  ...rest
}) {
  const clickable = !!rest.onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    role: clickable ? "button" : undefined,
    tabIndex: clickable ? 0 : undefined,
    className: clickable ? "focus-ring" : undefined,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 26,
      padding: onRemove ? "0 6px 0 10px" : "0 10px",
      borderRadius: "var(--r-sm)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-medium)",
      color: selected ? "var(--accent)" : "var(--text-2)",
      background: selected ? "var(--accent-ghost)" : "var(--bg-3)",
      border: `1px solid ${selected ? "var(--accent-line)" : "var(--border-2)"}`,
      cursor: clickable ? "pointer" : "default",
      userSelect: "none",
      ...style
    }
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Retirer",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: "grid",
      placeItems: "center",
      width: 16,
      height: 16,
      border: 0,
      background: "transparent",
      color: "inherit",
      cursor: "pointer",
      borderRadius: "var(--r-xs)",
      lineHeight: 1,
      fontSize: 13
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/devtools/LogConsole.jsx
try { (() => {
const LEVELS = {
  error: {
    c: "var(--log-error)",
    label: "ERR"
  },
  warning: {
    c: "var(--log-warning)",
    label: "WRN"
  },
  info: {
    c: "var(--log-info)",
    label: "INF"
  },
  debug: {
    c: "var(--log-debug)",
    label: "DBG"
  },
  trace: {
    c: "var(--log-trace)",
    label: "TRC"
  }
};
const ORDER = ["error", "warning", "info", "debug", "trace"];

/**
 * LogConsole — console devtools : niveaux error→trace, filtres masquables,
 * repliable. Monospace, fond très sombre. Style outil, pas de jeu dedans.
 */
function LogConsole({
  entries = [],
  defaultHidden = [],
  collapsible = true,
  title = "Console"
}) {
  const [hidden, setHidden] = React.useState(new Set(defaultHidden));
  const [open, setOpen] = React.useState(true);
  const bodyRef = React.useRef(null);
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [entries.length]);
  const toggle = lvl => setHidden(prev => {
    const next = new Set(prev);
    next.has(lvl) ? next.delete(lvl) : next.add(lvl);
    return next;
  });
  const shown = entries.filter(e => !hidden.has(e.level));
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      background: "var(--log-bg)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      minHeight: 0,
      height: "100%",
      overflow: "hidden",
      fontFamily: "var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderBottom: "1px solid var(--border-1)",
      background: "var(--log-gutter)"
    }
  }, collapsible && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    "aria-label": open ? "Replier" : "Déplier",
    className: "focus-ring",
    style: {
      border: 0,
      background: "transparent",
      color: "var(--text-3)",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    style: {
      transform: open ? "none" : "rotate(-90deg)",
      transition: "transform var(--dur-fast)"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: "var(--fs-sm)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginLeft: "auto"
    }
  }, ORDER.map(lvl => {
    const off = hidden.has(lvl);
    return /*#__PURE__*/React.createElement("button", {
      key: lvl,
      type: "button",
      onClick: () => toggle(lvl),
      "aria-pressed": !off,
      title: `${off ? "Afficher" : "Masquer"} ${lvl}`,
      className: "focus-ring",
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        padding: "2px 6px",
        borderRadius: "var(--r-xs)",
        border: `1px solid ${off ? "var(--border-2)" : LEVELS[lvl].c}`,
        cursor: "pointer",
        background: off ? "transparent" : "color-mix(in srgb, " + LEVELS[lvl].c + " 14%, transparent)",
        color: off ? "var(--text-3)" : LEVELS[lvl].c,
        opacity: off ? 0.5 : 1
      }
    }, LEVELS[lvl].label);
  }))), open && /*#__PURE__*/React.createElement("div", {
    ref: bodyRef,
    style: {
      overflowY: "auto",
      minHeight: 0,
      padding: "6px 0",
      fontSize: "var(--fs-mono)",
      lineHeight: 1.55
    }
  }, shown.map((e, i) => {
    const L = LEVELS[e.level] || LEVELS.debug;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        gap: 10,
        padding: "1px 12px",
        alignItems: "baseline"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--log-trace)"
      }
    }, e.ts || ""), /*#__PURE__*/React.createElement("span", {
      style: {
        color: L.c,
        fontWeight: 700,
        width: 30
      }
    }, L.label), /*#__PURE__*/React.createElement("span", {
      style: {
        color: e.level === "error" ? "var(--log-error)" : "var(--text-2)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }
    }, e.msg));
  }), shown.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px",
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)"
    }
  }, "Aucune ligne pour ces filtres.")));
}
Object.assign(__ds_scope, { LogConsole });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/devtools/LogConsole.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Dialog — fenêtre modale centrée + voile. Fermeture par Échap / clic voile.
 */
function Dialog({
  open,
  title,
  onClose,
  footer,
  width = 460,
  children
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.6)",
      zIndex: "var(--z-overlay)",
      display: "grid",
      placeItems: "center",
      padding: "var(--sp-6)"
    },
    className: "m-anim-scrim-in"
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === "string" ? title : undefined,
    style: {
      width: "100%",
      maxWidth: width,
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-3)",
      border: "1px solid var(--border-2)",
      borderRadius: "var(--r-xl)",
      boxShadow: "var(--shadow-pop)",
      overflow: "hidden"
    }
  }, title && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "var(--sp-4) var(--sp-5)",
      borderBottom: "1px solid var(--border-1)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h3)",
      fontWeight: 600,
      color: "var(--text-1)"
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Fermer",
    onClick: onClose,
    className: "focus-ring",
    style: {
      border: 0,
      background: "transparent",
      color: "var(--text-3)",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      width: 28,
      height: 28,
      borderRadius: "var(--r-sm)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--sp-5)",
      overflowY: "auto",
      color: "var(--text-2)",
      fontSize: "var(--fs-body)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--sp-2)",
      padding: "var(--sp-4) var(--sp-5)",
      borderTop: "1px solid var(--border-1)"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONES = {
  neutral: "var(--text-2)",
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  info: "var(--info)",
  spark: "var(--spark)"
};

/**
 * Toast — notification éphémère (enchère, pli pris, fin de partie). Liseré de
 * tonalité, fermeture optionnelle. Web et mobile partagent le composant.
 */
function Toast({
  tone = "neutral",
  title,
  message,
  icon,
  onClose,
  action
}) {
  const c = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      width: "100%",
      background: "var(--bg-4)",
      border: "1px solid var(--border-2)",
      borderRadius: "var(--r-md)",
      boxShadow: "var(--shadow-3)",
      padding: "12px 14px",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      background: c
    }
  }), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: c,
      display: "flex",
      marginTop: 1
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: "var(--fs-body)"
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-2)",
      fontSize: "var(--fs-sm)",
      marginTop: title ? 2 : 0
    }
  }, message), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, action)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Fermer",
    onClick: onClose,
    className: "focus-ring",
    style: {
      border: 0,
      background: "transparent",
      color: "var(--text-3)",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      width: 22,
      height: 22,
      borderRadius: "var(--r-xs)",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/**
 * Tooltip — infobulle au survol/focus. Web uniquement (pas de hover mobile).
 */
function Tooltip({
  content,
  side = "top",
  children
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocusCapture: () => setShow(true),
    onBlurCapture: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos,
      zIndex: "var(--z-tooltip)",
      whiteSpace: "nowrap",
      background: "var(--bg-0)",
      color: "var(--text-1)",
      border: "1px solid var(--border-2)",
      borderRadius: "var(--r-sm)",
      padding: "5px 9px",
      fontSize: "var(--fs-xs)",
      fontFamily: "var(--font-ui)",
      boxShadow: "var(--shadow-2)",
      pointerEvents: "none"
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — champ texte sombre. label, hint, état d'erreur, addon optionnels.
 */
function Input({
  label,
  hint,
  error,
  iconLeft,
  addonRight,
  id,
  style,
  ...rest
}) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const invalid = !!error;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-medium)",
      color: "var(--text-2)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: "var(--control-h)",
      padding: "0 12px",
      background: "var(--bg-inset)",
      borderRadius: "var(--r-md)",
      border: `1px solid ${invalid ? "var(--error)" : "var(--border-2)"}`,
      transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)"
    },
    onFocusCapture: e => {
      e.currentTarget.style.borderColor = invalid ? "var(--error)" : "var(--focus-ring)";
      e.currentTarget.style.boxShadow = `0 0 0 3px ${invalid ? "var(--error-ghost)" : "var(--accent-ghost)"}`;
    },
    onBlurCapture: e => {
      e.currentTarget.style.borderColor = invalid ? "var(--error)" : "var(--border-2)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-3)",
      display: "flex"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    "aria-invalid": invalid || undefined,
    "aria-describedby": hint || error ? `${fieldId}-msg` : undefined,
    style: {
      flex: 1,
      minWidth: 0,
      height: "100%",
      background: "transparent",
      border: 0,
      outline: "none",
      color: "var(--text-1)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body)",
      ...style
    }
  }, rest)), addonRight), (hint || error) && /*#__PURE__*/React.createElement("span", {
    id: `${fieldId}-msg`,
    style: {
      fontSize: "var(--fs-xs)",
      color: invalid ? "var(--error)" : "var(--text-3)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/**
 * Select — liste déroulante personnalisée (sombre, accessible au clavier).
 * options: [{ value, label }]. Contrôlé via value / onChange(value).
 */
function Select({
  label,
  value,
  options = [],
  onChange,
  placeholder = "Choisir…",
  disabled = false,
  id
}) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = options.find(o => o.value === value);
  React.useEffect(() => {
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%",
      position: "relative"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--text-2)"
    }
  }, label), /*#__PURE__*/React.createElement("button", {
    id: fieldId,
    type: "button",
    disabled: disabled,
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    className: "focus-ring",
    onClick: () => !disabled && setOpen(o => !o),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      height: "var(--control-h)",
      padding: "0 12px",
      width: "100%",
      background: "var(--bg-inset)",
      border: `1px solid ${open ? "var(--focus-ring)" : "var(--border-2)"}`,
      borderRadius: "var(--r-md)",
      color: current ? "var(--text-1)" : "var(--text-3)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? "var(--disabled-opacity)" : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, current ? current.label : placeholder), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    style: {
      color: "var(--text-3)",
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform var(--dur-fast)"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), open && /*#__PURE__*/React.createElement("ul", {
    role: "listbox",
    tabIndex: -1,
    style: {
      position: "absolute",
      top: "calc(100% + 4px)",
      left: 0,
      right: 0,
      margin: 0,
      padding: 4,
      listStyle: "none",
      background: "var(--bg-4)",
      border: "1px solid var(--border-2)",
      borderRadius: "var(--r-md)",
      boxShadow: "var(--shadow-3)",
      zIndex: "var(--z-dropdown)",
      maxHeight: 240,
      overflowY: "auto"
    }
  }, options.map(o => {
    const sel = o.value === value;
    return /*#__PURE__*/React.createElement("li", {
      key: o.value,
      role: "option",
      "aria-selected": sel,
      onClick: () => {
        onChange && onChange(o.value);
        setOpen(false);
      },
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: "var(--r-sm)",
        cursor: "pointer",
        fontSize: "var(--fs-body)",
        color: sel ? "var(--accent)" : "var(--text-1)",
        background: sel ? "var(--accent-ghost)" : "transparent"
      },
      onMouseEnter: e => {
        if (!sel) e.currentTarget.style.background = "var(--state-hover)";
      },
      onMouseLeave: e => {
        if (!sel) e.currentTarget.style.background = "transparent";
      }
    }, o.label, sel && /*#__PURE__*/React.createElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5"
    }, /*#__PURE__*/React.createElement("path", {
      d: "m20 6-11 11-5-5"
    })));
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Slider — curseur de réglage (personnalité de robot, vitesse, délais).
 * Affiche la valeur et remplit la piste jusqu'au pouce, couleur token.
 */
function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
  disabled = false,
  accent = "var(--accent)",
  id,
  ...rest
}) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const pct = (value - min) / (max - min) * 100;
  const display = format ? format(value) : value;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%",
      opacity: disabled ? "var(--disabled-opacity)" : 1
    }
  }, (label || format) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--text-2)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-sm)",
      color: "var(--text-1)",
      fontWeight: 600
    }
  }, display)), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    disabled: disabled,
    onChange: e => onChange && onChange(parseFloat(e.target.value)),
    className: "contree-slider",
    style: {
      width: "100%",
      height: 6,
      appearance: "none",
      WebkitAppearance: "none",
      borderRadius: "var(--r-full)",
      background: `linear-gradient(90deg, ${accent} ${pct}%, var(--bg-4) ${pct}%)`,
      outline: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      "--thumb": accent
    }
  }, rest)), /*#__PURE__*/React.createElement("style", null, `
        .contree-slider::-webkit-slider-thumb{ -webkit-appearance:none; width:16px;height:16px;border-radius:50%;
          background:var(--text-1); border:3px solid var(--thumb); box-shadow:var(--shadow-1); cursor:pointer; }
        .contree-slider::-moz-range-thumb{ width:16px;height:16px;border-radius:50%;
          background:var(--text-1); border:3px solid var(--thumb); cursor:pointer; }
        .contree-slider:focus-visible{ outline:var(--focus-ring-w) solid var(--focus-ring); outline-offset:4px; }
      `));
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/devtools/ControlBar.jsx
try { (() => {
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 12];
const Play = () => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "currentColor"
}, /*#__PURE__*/React.createElement("path", {
  d: "M7 5v14l12-7z"
}));
const Pause = () => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "currentColor"
}, /*#__PURE__*/React.createElement("rect", {
  x: "6",
  y: "5",
  width: "4",
  height: "14",
  rx: "1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "5",
  width: "4",
  height: "14",
  rx: "1"
}));
const Step = () => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "currentColor"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 5v14l9-7z"
}), /*#__PURE__*/React.createElement("rect", {
  x: "16",
  y: "5",
  width: "3",
  height: "14",
  rx: "1"
}));

/**
 * ControlBar — pilotage du moteur d'entraînement : pause/play, step,
 * vitesse 0.25×→12×, délais avant/après pli. N'altère pas l'état, émet des events.
 */
function ControlBar({
  playing = false,
  speed = 1,
  delayBefore = 400,
  delayAfter = 700,
  onTogglePlay,
  onStep,
  onSpeed,
  onDelayBefore,
  onDelayAfter
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--sp-4)",
      flexWrap: "wrap",
      background: "var(--bg-3)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      padding: "var(--sp-3) var(--sp-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: playing ? "Pause" : "Lancer",
    variant: "accent",
    onClick: onTogglePlay
  }, playing ? /*#__PURE__*/React.createElement(Pause, null) : /*#__PURE__*/React.createElement(Play, null)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Pas \xE0 pas",
    variant: "solid",
    onClick: onStep,
    disabled: playing
  }, /*#__PURE__*/React.createElement(Step, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-xs)",
      color: "var(--text-3)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-caps)",
      marginRight: 4
    }
  }, "Vitesse"), SPEEDS.map(s => {
    const on = s === speed;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      onClick: () => onSpeed && onSpeed(s),
      className: "focus-ring",
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-xs)",
        fontWeight: 600,
        padding: "4px 8px",
        borderRadius: "var(--r-sm)",
        cursor: "pointer",
        border: `1px solid ${on ? "var(--spark)" : "var(--border-2)"}`,
        background: on ? "var(--spark-ghost)" : "transparent",
        color: on ? "var(--spark)" : "var(--text-2)"
      }
    }, s, "\xD7");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--sp-5)",
      flex: 1,
      minWidth: 260
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Slider, {
    label: "D\xE9lai avant pli",
    value: delayBefore,
    min: 0,
    max: 2000,
    step: 50,
    onChange: onDelayBefore,
    format: v => `${v} ms`,
    accent: "var(--spark)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Slider, {
    label: "D\xE9lai apr\xE8s pli",
    value: delayAfter,
    min: 0,
    max: 2000,
    step: 50,
    onChange: onDelayAfter,
    format: v => `${v} ms`,
    accent: "var(--spark)"
  }))));
}
Object.assign(__ds_scope, { ControlBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/devtools/ControlBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — bascule on/off accessible (timings auto, robot actif…).
 */
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  ...rest
}) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const toggle = () => {
    if (!disabled && onChange) onChange(!checked);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? "var(--disabled-opacity)" : 1,
      userSelect: "none"
    }
  }, /*#__PURE__*/React.createElement("button", _extends({
    id: fieldId,
    type: "button",
    role: "switch",
    "aria-checked": checked,
    "aria-label": label,
    disabled: disabled,
    onClick: toggle,
    className: "focus-ring",
    style: {
      width: 40,
      height: 24,
      borderRadius: "var(--r-full)",
      border: 0,
      position: "relative",
      flex: "0 0 auto",
      background: checked ? "var(--accent)" : "var(--bg-4)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background var(--dur-fast) var(--ease-out)"
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 19 : 3,
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: checked ? "var(--text-on-accent)" : "var(--text-1)",
      boxShadow: "var(--shadow-1)",
      transition: "left var(--dur-fast) var(--ease-out)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-body)",
      color: "var(--text-2)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/score/TeamBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Hash FNV-1a 32-bit déterministe. */
function hashName(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Couleur d'équipe (HSL) dérivée du nom — source de vérité unique. */
function teamColor(name) {
  const h = hashName(name || "");
  return {
    h: h % 360,
    s: 58 + (h >> 9) % 18,
    l: 52 + (h >> 17) % 10
  };
}

/**
 * TeamBadge — identicon algorithmique 5×5 (façon GitHub) + couleur HSL
 * dérivée du nom du clan. Optionnellement nom + total de points.
 * La couleur n'est JAMAIS codée en dur : toujours issue du hash.
 */
function TeamBadge({
  name,
  size = 40,
  showName = false,
  points = null,
  animate = false,
  style,
  ...rest
}) {
  const h = hashName(name || "");
  const c = teamColor(name);
  const fg = `hsl(${c.h} ${c.s}% ${c.l}%)`;
  const cell = size / 5;
  const cells = [];
  let k = 0;
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 5; y++) {
      if (h >> x * 5 + y & 1) {
        const xs = x === 2 ? [2] : [x, 4 - x];
        for (const cx of xs) {
          cells.push(/*#__PURE__*/React.createElement("rect", {
            key: `${cx}-${y}`,
            x: cx * cell,
            y: y * cell,
            width: cell,
            height: cell,
            rx: Math.max(1, cell * 0.12),
            fill: fg,
            className: animate ? "anim-identicon-cell" : undefined,
            style: animate ? {
              "--i": k++
            } : undefined
          }));
        }
      }
    }
  }
  const svg = /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label": `Clan ${name}`,
    style: {
      borderRadius: "var(--r-md)",
      background: "var(--bg-3)",
      border: "1px solid var(--border-1)",
      display: "block",
      flex: "0 0 auto"
    }
  }, cells);
  if (!showName && points == null) return /*#__PURE__*/React.createElement("span", _extends({
    style: style
  }, rest), svg);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      ...style
    }
  }, rest), svg, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, showName && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: "var(--fs-body)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, name), points != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-sm)",
      color: fg,
      fontWeight: 600
    }
  }, points.toLocaleString("fr-FR"), " pts")));
}
Object.assign(__ds_scope, { teamColor, TeamBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/score/TeamBadge.jsx", error: String((e && e.message) || e) }); }

// components/score/RecapTable.jsx
try { (() => {
/**
 * RecapTable — récapitulatif de fin de partie : une ligne par donne,
 * colonnes équipe A / équipe B, totaux de manche, vainqueur surligné.
 */
function RecapTable({
  teamA,
  teamB,
  rows = [],
  winner
}) {
  const totA = rows.reduce((s, r) => s + (r.a || 0), 0);
  const totB = rows.reduce((s, r) => s + (r.b || 0), 0);
  const th = {
    textAlign: "right",
    padding: "8px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--fs-sm)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: "var(--font-ui)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--bg-3)"
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "left",
      padding: "10px 12px",
      fontSize: "var(--fs-xs)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-3)"
    }
  }, "Donne"), /*#__PURE__*/React.createElement(HeadTeam, {
    team: teamA,
    won: winner === "a"
  }), /*#__PURE__*/React.createElement(HeadTeam, {
    team: teamB,
    won: winner === "b"
  }), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "left",
      padding: "10px 12px",
      fontSize: "var(--fs-xs)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-3)"
    }
  }, "Contrat"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-1)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 12px",
      color: "var(--text-3)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-sm)"
    }
  }, r.label || `#${i + 1}`, r.roundEnd && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      marginLeft: 6
    }
  }, "\u25B8 fin manche")), /*#__PURE__*/React.createElement("td", {
    style: {
      ...th,
      color: r.a >= r.b ? "var(--text-1)" : "var(--text-3)",
      fontWeight: r.a >= r.b ? 600 : 400
    }
  }, fmt(r.a)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...th,
      color: r.b > r.a ? "var(--text-1)" : "var(--text-3)",
      fontWeight: r.b > r.a ? 600 : 400
    }
  }, fmt(r.b)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 12px",
      fontSize: "var(--fs-sm)",
      color: "var(--text-2)"
    }
  }, r.contract || "—")))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderTop: "2px solid var(--border-2)",
      background: "var(--bg-3)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "10px 12px",
      fontWeight: 700,
      color: "var(--text-1)"
    }
  }, "Total"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...th,
      fontSize: "var(--fs-body)",
      fontWeight: 700,
      color: winner === "a" ? "var(--accent)" : "var(--text-1)"
    }
  }, totA), /*#__PURE__*/React.createElement("td", {
    style: {
      ...th,
      fontSize: "var(--fs-body)",
      fontWeight: 700,
      color: winner === "b" ? "var(--accent)" : "var(--text-1)"
    }
  }, totB), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "10px 12px",
      fontSize: "var(--fs-sm)",
      color: "var(--accent)",
      fontWeight: 600
    }
  }, winner ? `Victoire ${winner === "a" ? teamA.name : teamB.name}` : "")))));
}
function HeadTeam({
  team,
  won
}) {
  return /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      justifyContent: "flex-end",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TeamBadge, {
    name: team.name,
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-sm)",
      fontWeight: 600,
      color: won ? "var(--accent)" : "var(--text-1)",
      whiteSpace: "nowrap"
    }
  }, team.name)));
}
function fmt(n) {
  return n == null ? "—" : n;
}
Object.assign(__ds_scope, { RecapTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/score/RecapTable.jsx", error: String((e && e.message) || e) }); }

// components/score/ScoreBoard.jsx
try { (() => {
/**
 * ScoreBoard — bandeau de score : équipe A · centre · équipe B.
 * Affiche identicons, cumul de manche live, brut de donne, manche courante.
 */
function ScoreBoard({
  teamA,
  teamB,
  target = 1500,
  round = 1,
  rounds = 3,
  brut,
  compact = false
}) {
  const leadA = (teamA.score || 0) >= (teamB.score || 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      gap: compact ? "var(--sp-3)" : "var(--sp-5)",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-lg)",
      padding: compact ? "var(--sp-2) var(--sp-3)" : "var(--sp-3) var(--sp-5)"
    }
  }, /*#__PURE__*/React.createElement(TeamSide, {
    team: teamA,
    lead: leadA,
    brut: brut?.a,
    align: "left",
    compact: compact
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
      padding: "0 var(--sp-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "var(--text-3)",
      letterSpacing: "0.04em"
    }
  }, "MANCHE ", round, "/", rounds), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "var(--accent)",
      whiteSpace: "nowrap"
    }
  }, "\u2192 ", target)), /*#__PURE__*/React.createElement(TeamSide, {
    team: teamB,
    lead: !leadA,
    brut: brut?.b,
    align: "right",
    compact: compact
  }));
}
function TeamSide({
  team,
  lead,
  brut,
  align,
  compact
}) {
  const right = align === "right";
  const c = team.color || "var(--team-a)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: compact ? 8 : 12,
      flexDirection: right ? "row-reverse" : "row",
      justifyContent: right ? "flex-start" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TeamBadge, {
    name: team.name,
    size: compact ? 30 : 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: right ? "flex-end" : "flex-start",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      color: "var(--text-1)",
      fontSize: compact ? "var(--fs-sm)" : "var(--fs-body)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      flexDirection: right ? "row-reverse" : "row"
    }
  }, team.name, lead && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--accent)"
    },
    title: "En t\xEAte"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      flexDirection: right ? "row-reverse" : "row"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "anim-score-tick",
    key: team.score,
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: compact ? 20 : 26,
      color: "var(--text-1)",
      lineHeight: 1
    }
  }, (team.score || 0).toLocaleString("fr-FR")), brut != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: c
    }
  }, "+", brut))));
}
Object.assign(__ds_scope, { ScoreBoard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/score/ScoreBoard.jsx", error: String((e && e.message) || e) }); }

// components/table/PlayingCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SUITS = {
  hearts: {
    glyph: "♥",
    color: "var(--card-red)"
  },
  diamonds: {
    glyph: "♦",
    color: "var(--card-red)"
  },
  spades: {
    glyph: "♠",
    color: "var(--card-black)"
  },
  clubs: {
    glyph: "♣",
    color: "var(--card-black)"
  }
};
const SIZES = {
  sm: {
    w: 44,
    h: 62,
    r: 16,
    c: 11
  },
  md: {
    w: 62,
    h: 88,
    r: 24,
    c: 15
  },
  lg: {
    w: 86,
    h: 122,
    r: 34,
    c: 20
  }
};

/**
 * PlayingCard — carte de Belote. Face (rang + couleur) ou dos. Tailles sm/md/lg.
 * États : playable (surlignée jouable), winning (lueur), disabled (atténuée).
 */
function PlayingCard({
  rank = "A",
  suit = "spades",
  size = "md",
  faceDown = false,
  playable = false,
  winning = false,
  disabled = false,
  raised = false,
  onClick,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const meta = SUITS[suit] || SUITS.spades;
  const interactive = !!onClick && !disabled;
  if (faceDown) {
    return /*#__PURE__*/React.createElement("div", _extends({
      "aria-label": "Carte face cach\xE9e",
      style: {
        width: s.w,
        height: s.h,
        borderRadius: "var(--r-card)",
        flex: "0 0 auto",
        background: `repeating-linear-gradient(45deg, var(--card-back), var(--card-back) 5px, var(--card-back-line) 5px, var(--card-back-line) 10px)`,
        border: "3px solid var(--card-face)",
        boxShadow: "var(--shadow-2)",
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: interactive ? "button" : undefined,
    onClick: interactive ? onClick : undefined,
    disabled: disabled,
    "aria-label": `${rank} de ${frSuit(suit)}${playable ? ", jouable" : ""}`,
    className: interactive ? "focus-ring" : undefined,
    style: {
      position: "relative",
      width: s.w,
      height: s.h,
      padding: 0,
      flex: "0 0 auto",
      borderRadius: "var(--r-card)",
      background: "var(--card-face)",
      color: meta.color,
      border: "1px solid var(--card-face-edge)",
      cursor: interactive ? "pointer" : "default",
      boxShadow: winning ? "var(--glow-win)" : playable ? "var(--glow-accent)" : "var(--shadow-2)",
      opacity: disabled ? "var(--card-disabled)" : 1,
      transform: raised || winning ? "translateY(-10px)" : "none",
      transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      fontFamily: "var(--font-display)",
      overflow: "hidden",
      display: "block",
      ...style
    },
    onMouseEnter: interactive ? e => {
      if (playable) e.currentTarget.style.transform = "translateY(-10px)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.transform = raised || winning ? "translateY(-10px)" : "none";
    } : undefined
  }, rest), /*#__PURE__*/React.createElement(Corner, {
    rank: rank,
    glyph: meta.glyph,
    size: s.c,
    pos: "tl"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      fontSize: s.w * 0.5,
      lineHeight: 1,
      opacity: 0.95
    }
  }, meta.glyph), /*#__PURE__*/React.createElement(Corner, {
    rank: rank,
    glyph: meta.glyph,
    size: s.c,
    pos: "br"
  }));
}
function Corner({
  rank,
  glyph,
  size,
  pos
}) {
  const base = {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    lineHeight: 0.95,
    fontWeight: 700
  };
  const place = pos === "tl" ? {
    top: 4,
    left: 5
  } : {
    bottom: 4,
    right: 5,
    transform: "rotate(180deg)"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...base,
      ...place
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size
    }
  }, rank), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size * 0.82
    }
  }, glyph));
}
function frSuit(s) {
  return {
    hearts: "cœur",
    diamonds: "carreau",
    spades: "pique",
    clubs: "trèfle"
  }[s] || s;
}
Object.assign(__ds_scope, { PlayingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/table/PlayingCard.jsx", error: String((e && e.message) || e) }); }

// components/table/TableFelt.jsx
try { (() => {
const POS = {
  south: {
    bottom: "6%",
    left: "50%",
    tx: "-50%",
    ty: "0"
  },
  north: {
    top: "6%",
    left: "50%",
    tx: "-50%",
    ty: "0"
  },
  west: {
    left: "4%",
    top: "50%",
    tx: "0",
    ty: "-50%"
  },
  east: {
    right: "4%",
    top: "50%",
    tx: "0",
    ty: "-50%"
  }
};
const TRICK = {
  south: {
    bottom: "30%",
    left: "50%",
    tx: "-50%",
    ty: "0"
  },
  north: {
    top: "30%",
    left: "50%",
    tx: "-50%",
    ty: "0"
  },
  west: {
    left: "32%",
    top: "50%",
    tx: "0",
    ty: "-50%"
  },
  east: {
    right: "32%",
    top: "50%",
    tx: "0",
    ty: "-50%"
  }
};

/**
 * TableFelt — tapis de jeu : 4 sièges (N/E/S/O), pli central, panneau du pli
 * précédent. Le siège actif est surligné. Couleurs d'équipe via tokens.
 */
function TableFelt({
  seats = [],
  trick = {},
  prevTrick = null,
  atout = null,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: 380,
      borderRadius: "var(--r-xl)",
      overflow: "hidden",
      border: "4px solid var(--felt-rail)",
      boxShadow: "var(--shadow-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(120% 110% at 50% 42%, var(--felt-bright), var(--felt) 52%, var(--felt-edge))"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      width: 150,
      height: 150,
      borderRadius: "50%",
      border: "1px dashed var(--felt-line)"
    }
  }), atout && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
      color: "#cfeede",
      fontSize: "var(--fs-xs)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, "Atout"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      color: suitColor(atout)
    }
  }, suitGlyph(atout))), seats.map(seat => /*#__PURE__*/React.createElement(Seat, {
    key: seat.dir,
    seat: seat
  })), Object.entries(trick).map(([dir, card]) => card && /*#__PURE__*/React.createElement("div", {
    key: dir,
    className: "anim-card-deal",
    style: {
      position: "absolute",
      ...absFor(TRICK[dir])
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PlayingCard, {
    rank: card.rank,
    suit: card.suit,
    size: "md",
    winning: card.winning
  }))), prevTrick && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      background: "rgba(8,12,10,.7)",
      backdropFilter: "blur(6px)",
      border: "1px solid var(--felt-line)",
      borderRadius: "var(--r-md)",
      padding: "8px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-xs)",
      color: "#bfe6d6",
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }
  }, "Pli pr\xE9c\xE9dent"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, prevTrick.map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.PlayingCard, {
    key: i,
    rank: c.rank,
    suit: c.suit,
    size: "sm",
    winning: c.winning
  })))), children);
}
function Seat({
  seat
}) {
  const p = POS[seat.dir] || POS.south;
  const active = seat.active;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      ...absFor(p),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 10px 5px 6px",
      background: active ? "rgba(234,178,58,.16)" : "rgba(8,12,10,.55)",
      border: `1px solid ${active ? "var(--accent-line)" : "var(--felt-line)"}`,
      borderRadius: "var(--r-full)",
      boxShadow: active ? "var(--glow-accent)" : "none",
      backdropFilter: "blur(4px)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TeamBadge, {
    name: seat.team || seat.name,
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.15
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--fs-sm)",
      color: active ? "var(--accent-strong)" : "#eaf3ee",
      whiteSpace: "nowrap"
    }
  }, seat.name, seat.isRobot && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 5,
      color: "var(--spark)",
      fontSize: "var(--fs-xs)"
    }
  }, "BOT")), seat.cards != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "#9fc4b4"
    }
  }, seat.cards, " cartes"))), seat.dir !== "south" && seat.cards != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: -8
    }
  }, Array.from({
    length: Math.min(seat.cards, 6)
  }).map((_, i) => /*#__PURE__*/React.createElement(__ds_scope.PlayingCard, {
    key: i,
    faceDown: true,
    size: "sm",
    style: {
      marginLeft: i ? -22 : 0
    }
  }))));
}
function absFor(p) {
  return {
    top: p.top,
    bottom: p.bottom,
    left: p.left,
    right: p.right,
    transform: `translate(${p.tx}, ${p.ty})`
  };
}
function suitGlyph(s) {
  return {
    hearts: "♥",
    diamonds: "♦",
    spades: "♠",
    clubs: "♣"
  }[s] || s;
}
function suitColor(s) {
  return s === "hearts" || s === "diamonds" ? "var(--card-red)" : "#e7eef0";
}
Object.assign(__ds_scope, { TableFelt });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/table/TableFelt.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/app.js
try { (() => {
/* ===========================================================================
   Contrée — Mobile (HTML/TS vanilla). Surface 100% séparée du web.
   Navigation par tab bar, écrans rendus en vanilla JS, tokens partagés.
   =========================================================================== */
(() => {
  "use strict";

  /* ---- Identicon (même algo que TeamBadge web, source de vérité partagée) - */
  function hashName(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function identicon(name, size) {
    const h = hashName(name || ""),
      hue = h % 360,
      sat = 58 + (h >> 9) % 18,
      lig = 52 + (h >> 17) % 10;
    const fg = `hsl(${hue} ${sat}% ${lig}%)`,
      cell = size / 5;
    let r = "";
    for (let x = 0; x < 3; x++) for (let y = 0; y < 5; y++) {
      if (h >> x * 5 + y & 1) {
        const xs = x === 2 ? [2] : [x, 4 - x];
        for (const cx of xs) r += `<rect x="${cx * cell}" y="${y * cell}" width="${cell}" height="${cell}" rx="1.5" fill="${fg}"/>`;
      }
    }
    return `<svg class="identicon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Clan ${name}">${r}</svg>`;
  }
  function teamHue(name) {
    return hashName(name) % 360;
  }

  /* ---- Icônes (line, stroke 2) -------------------------------------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 14 9-14 9V3Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 0 12 0V4H6v5Z"/><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 21h6M12 17v4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ---- Cartes ------------------------------------------------------------- */
  const SUIT = {
    hearts: ["♥", "red"],
    diamonds: ["♦", "red"],
    spades: ["♠", "black"],
    clubs: ["♣", "black"]
  };
  function card(rank, suit, w, opts = {}) {
    const [g, col] = SUIT[suit];
    const h = Math.round(w * 1.4);
    const cls = `pc ${col}${opts.playable ? " playable" : ""}`;
    return `<div class="${cls}" style="width:${w}px;height:${h}px">
      <span class="corner" style="font-size:${Math.round(w * 0.26)}px"><span>${rank}</span><span>${g}</span></span>
      <span class="pip" style="font-size:${Math.round(w * 0.5)}px">${g}</span></div>`;
  }
  function backCard(w, ml) {
    const h = Math.round(w * 1.4);
    return `<div class="pc back" style="width:${w}px;height:${h}px;margin-left:${ml}px"></div>`;
  }

  /* ---- Données simulées --------------------------------------------------- */
  const TEAM = {
    name: "Les Atouts",
    pts: 4820,
    rank: 1
  };
  const LIVE = [{
    id: 214,
    a: "Les Atouts",
    b: "Capot City",
    round: "Manche 2/3",
    watchers: 7
  }, {
    id: 240,
    a: "Trèfle FC",
    b: "Capot City",
    round: "Manche 1/2",
    watchers: 12
  }, {
    id: 251,
    a: "Roi & Dame",
    b: "Belote Club",
    round: "Manche 3/3",
    watchers: 23
  }];
  let ROBOTS = [{
    id: 1,
    name: "Iznogoud",
    agr: 82,
    conc: 60,
    vel: 70,
    win: 73,
    active: true
  }, {
    id: 2,
    name: "Roboubelot",
    agr: 40,
    conc: 85,
    vel: 50,
    win: 68,
    active: true
  }, {
    id: 3,
    name: "Le Prudent",
    agr: 20,
    conc: 95,
    vel: 30,
    win: 61,
    active: false
  }];
  const HAND = [["A", "hearts"], ["10", "hearts"], ["R", "spades"], ["9", "spades"], ["V", "clubs"], ["8", "diamonds"], ["7", "diamonds"]];

  /* ---- DOM refs ----------------------------------------------------------- */
  const $topbar = document.getElementById("topbar");
  const $content = document.getElementById("content");
  const $tabbar = document.getElementById("tabbar");
  const $overlay = document.getElementById("overlay-root");
  const $toasts = document.getElementById("toasts");
  const TABS = [{
    id: "home",
    label: "Accueil",
    icon: I.home
  }, {
    id: "play",
    label: "Jouer",
    icon: I.play
  }, {
    id: "watch",
    label: "Regarder",
    icon: I.eye
  }, {
    id: "robots",
    label: "Robots",
    icon: I.bot
  }, {
    id: "profile",
    label: "Profil",
    icon: I.user
  }];
  let current = "home";

  /* ---- Status bar + topbar ------------------------------------------------ */
  function statusbar() {
    return `<div class="m-statusbar"><span>9:41</span><span class="right">5G ▪ ▰▰▰▱</span></div>`;
  }
  function topbar(title, opts = {}) {
    const left = opts.back ? `<button class="btn btn--ghost" style="height:36px;padding:0 6px" onclick="__nav('${opts.back}')">${I.back}</button>` : `<h1>Contr<span class="accent">é</span>e</h1>`;
    const right = opts.right || identicon(TEAM.name, 30);
    $topbar.innerHTML = statusbar() + `<div class="m-topbar__bar">${opts.back ? `${left}<h1 style="font-size:19px">${title}</h1><span style="width:36px"></span>` : `${left}${right}`}</div>`;
  }

  /* ---- Screens ------------------------------------------------------------ */
  const screens = {
    home() {
      topbar();
      const rail = LIVE.map((g, i) => gameCard(g, i)).join("");
      $content.innerHTML = `
        <div class="hero">
          ${identicon(TEAM.name, 64)}
          <div style="flex:1;min-width:0">
            <div class="between"><span class="t1" style="font-family:var(--font-display);font-weight:700;font-size:18px">${TEAM.name}</span><span class="badge badge--rank">#${TEAM.rank}</span></div>
            <div class="pts" style="margin-top:4px"><span class="big">${TEAM.pts.toLocaleString("fr-FR")}</span><span class="u">pts récompense</span></div>
          </div>
        </div>

        <div class="card between">
          <div><div class="lab" style="margin:0 0 4px">Reprendre</div><div class="t1" style="font-weight:600">Table #214 · Manche 2/3</div></div>
          <button class="btn btn--primary" onclick="__nav('play')">${I.play}</button>
        </div>

        <div>
          <div class="between" style="margin-bottom:10px"><span class="section-title">Parties en direct</span><span class="badge badge--spark"><span class="dot"></span>Live</span></div>
          <div class="m-cardrail">${rail}</div>
        </div>

        <div class="shortcuts">
          ${shortcut("play", I.play, "Jouer", "Partie rapide")}
          ${shortcut("watch", I.eye, "Regarder", "3 en direct")}
          ${shortcut("robots", I.bot, "Mes robots", "3 robots")}
          ${shortcut("team", I.trophy, "Mon équipe", "1er au classement")}
        </div>`;
    },
    play() {
      topbar("Partie", {
        right: `<button class="btn btn--ghost" style="height:36px" onclick="__sheet('quick')">Quitter</button>`
      });
      const seats = `
        <div class="seat north"><div class="chip">${identicon("Capot City", 22)}<b>Roboubelot <span class="bot">BOT</span></b></div>${backRow(6)}</div>
        <div class="seat west"><div class="chip">${identicon("Capot City", 22)}<b>Iznog. <span class="bot">BOT</span></b></div></div>
        <div class="seat east"><div class="chip">${identicon("Les Atouts", 22)}<b>Partenaire</b></div></div>
        <div class="seat south"><div class="chip active">${identicon("Les Atouts", 22)}<b>Vous</b></div></div>`;
      const trick = `
        <div class="trick north">${card("7", "hearts", 46)}</div>
        <div class="trick west">${card("9", "hearts", 46)}</div>`;
      const hand = HAND.map(([r, s]) => `<div onclick="__play(this)">${card(r, s, 56, {
        playable: true
      })}</div>`).join("");
      $content.style.padding = "0";
      $content.innerHTML = `
        <div class="m-layout-game" style="height:100%">
          <div class="m-score-band" style="position:static">
            <div class="team-mini">${identicon("Les Atouts", 26)}<b>1240</b></div>
            <span class="mono muted" style="font-size:12px">MANCHE 2/3 · →1500 · ♥</span>
            <div class="team-mini"><b>980</b>${identicon("Capot City", 26)}</div>
          </div>
          <div class="felt-portrait">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;border-radius:50%;border:1px dashed var(--felt-line)"></div>
            ${seats}${trick}
          </div>
          <div class="m-hand-drawer" id="drawer">${hand}</div>
        </div>`;
    },
    watch() {
      topbar("Regarder");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `<div class="m-list">${LIVE.map((g, i) => gameCard(g, i, true)).join("")}</div>`;
    },
    robots() {
      topbar("Mes robots");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `
        <p class="muted" style="font-size:13px;margin:0">Glissez une ligne vers la gauche pour supprimer, touchez pour éditer.</p>
        <div class="m-list" id="robotlist">${ROBOTS.map(robotRow).join("")}</div>`;
      const fab = document.createElement("button");
      fab.className = "m-fab";
      fab.style.position = "absolute";
      fab.innerHTML = I.plus;
      fab.onclick = () => __sheet("newbot");
      // FAB ancré dans le device
      const host = document.querySelector(".device .app-mobile");
      const old = host.querySelector(".m-fab");
      if (old) old.remove();
      host.appendChild(fab);
      bindSwipe();
    },
    team() {
      topbar("Mon équipe", {
        back: "home"
      });
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      const members = ["Vous", "Marlène", "Tonio", "K. Belote"].map(m => `<div class="list-item"><div class="row">${identicon(m, 30)}<span class="t1" style="font-weight:600">${m}</span></div><span class="mono muted" style="font-size:12px">${900 + hashName(m) % 800} pts</span></div>`).join("");
      $content.innerHTML = `
        <div class="profile-head">
          ${identicon(TEAM.name, 96)}
          <div class="name">${TEAM.name}</div>
          <div class="row"><span class="badge badge--rank">#${TEAM.rank}</span><span class="badge badge--accent">${TEAM.pts.toLocaleString("fr-FR")} pts</span></div>
        </div>
        <div class="card"><div class="lab">Membres</div>${members}</div>
        <div class="card"><div class="lab">Dernières parties</div>
          <div class="list-item"><span class="t1">vs Capot City</span><span class="badge badge--accent">+240</span></div>
          <div class="list-item"><span class="t1">vs Trèfle FC</span><span class="badge" style="background:var(--error-ghost);color:var(--error)">−90</span></div>
          <div class="list-item"><span class="t1">vs Belote Club</span><span class="badge badge--accent">+180</span></div>
        </div>`;
    },
    profile() {
      topbar("Profil");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `
        <div class="profile-head">
          ${identicon("Vous", 80)}
          <div class="name">Vous</div>
          <div class="row" onclick="__nav('team')" style="cursor:pointer">${identicon(TEAM.name, 24)}<span class="muted">${TEAM.name} · #${TEAM.rank}</span></div>
        </div>
        <div class="card">
          <div class="lab">Timings</div>
          <div class="list-item"><span class="t1">Animations automatiques</span>${toggle(true)}</div>
          <div class="list-item"><span class="t1">Confirmer chaque carte</span>${toggle(false)}</div>
        </div>
        <div class="card">
          <div class="lab">Partie</div>
          <div class="field"><div class="between"><span class="t1">Manches par défaut</span></div>
            <div class="segment"><button>1</button><button class="on">2</button><button>4</button></div></div>
        </div>
        <button class="btn btn--danger btn--full btn--lg">Se déconnecter</button>`;
    }
  };

  /* ---- Fragments ---------------------------------------------------------- */
  function shortcut(nav, icon, title, sub) {
    return `<button class="shortcut" onclick="__nav('${nav}')">${icon}<div><span>${title}</span><br><small>${sub}</small></div></button>`;
  }
  function gameCard(g, i, full) {
    return `<div class="gcard" style="${full ? "" : "width:100%"}" onclick="__sheet('join', ${g.id})">
      <div class="between"><span class="badge badge--spark"><span class="dot"></span>Live · #${g.id}</span><span class="mono muted" style="font-size:12px">${g.watchers} 👁</span></div>
      <div class="teams">
        <div class="team-mini">${identicon(g.a, 30)}<b>${g.a}</b></div>
        <span class="vs">vs</span>
        <div class="team-mini"><b>${g.b}</b>${identicon(g.b, 30)}</div>
      </div>
      <div class="between"><span class="muted" style="font-size:13px">${g.round}</span><span class="muted" style="font-size:13px">Touchez pour rejoindre</span></div>
    </div>`;
  }
  function robotRow(r) {
    return `<div class="swipe-wrap" data-id="${r.id}">
      <div class="swipe-bg">Supprimer</div>
      <div class="swipe-row" data-row onclick="__sheet('editbot', ${r.id})">
        <div class="row">${identicon(r.name, 34)}
          <div><div class="t1" style="font-weight:600">${r.name} ${r.active ? "" : '<span class="muted" style="font-size:11px">· off</span>'}</div>
          <div class="mono muted" style="font-size:12px">${r.win}% réussite · agr ${r.agr}</div></div>
        </div>
        <span class="badge badge--accent">${r.win > 70 ? "Pro" : "Rookie"}</span>
      </div></div>`;
  }
  function toggle(on) {
    return `<span class="m-toggle" data-on="${on}" onclick="__toggle(this)" style="width:44px;height:26px;border-radius:999px;background:${on ? "var(--accent)" : "var(--bg-4)"};position:relative;display:inline-block;cursor:pointer">
      <span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:50%;background:${on ? "var(--text-on-accent)" : "var(--text-1)"};transition:left .15s"></span></span>`;
  }
  function backRow(n) {
    let s = '<div style="display:flex;margin-top:4px">';
    for (let i = 0; i < Math.min(n, 5); i++) s += backCard(26, i ? -16 : 0);
    return s + "</div>";
  }

  /* ---- Tab bar ------------------------------------------------------------ */
  function renderTabs() {
    $tabbar.innerHTML = TABS.map(t => `<button class="m-tab" role="tab" aria-selected="${current === t.id}" onclick="__nav('${t.id}')">${t.icon}<span>${t.label}</span></button>`).join("");
  }

  /* ---- Navigation --------------------------------------------------------- */
  function nav(id) {
    current = id;
    $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
    const host = document.querySelector(".device .app-mobile");
    const fab = host.querySelector(".m-fab");
    if (fab && id !== "robots") fab.remove();
    (screens[id] || screens.home)();
    renderTabs();
    $content.scrollTop = 0;
  }
  window.__nav = nav;

  /* ---- Sheets ------------------------------------------------------------- */
  const SHEETS = {
    join: id => `<div class="grip"></div>
      <div class="section-title" style="margin-bottom:14px">Table #${id}</div>
      <button class="btn btn--primary btn--full btn--lg" style="margin-bottom:10px" onclick="__closeSheet();__toast('Vous avez rejoint la table')">Rejoindre la partie</button>
      <button class="btn btn--full" onclick="__closeSheet();__nav('play')">Observer en spectateur</button>`,
    quick: () => `<div class="grip"></div>
      <div class="section-title" style="margin-bottom:14px">Quitter la partie ?</div>
      <button class="btn btn--danger btn--full btn--lg" style="margin-bottom:10px" onclick="__closeSheet();__nav('home')">Quitter</button>
      <button class="btn btn--full" onclick="__closeSheet()">Rester</button>`,
    newbot: () => botForm({
      name: "Nouveau robot",
      agr: 50,
      conc: 50,
      vel: 50
    }, true),
    editbot: id => botForm(ROBOTS.find(r => r.id === id), false)
  };
  function botForm(r, isNew) {
    const slider = (key, label, v) => `<div class="field"><div class="between"><span class="t1">${label}</span><span id="v-${key}">${v}</span></div>
      <input class="m-range" type="range" min="0" max="100" value="${v}" oninput="document.getElementById('v-${key}').textContent=this.value"></div>`;
    return `<div class="grip"></div>
      <div class="between" style="margin-bottom:14px"><span class="section-title">${isNew ? "Nouveau robot" : r.name}</span>
        ${isNew ? "" : '<span class="badge badge--accent">' + r.win + '%</span>'}</div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${slider("agr", "Agressivité", r.agr)}
        ${slider("conc", "Concentration", r.conc)}
        ${slider("vel", "Vélocité", r.vel)}
      </div>
      <button class="btn btn--primary btn--full btn--lg" style="margin-top:18px" onclick="__closeSheet();__toast('${isNew ? "Robot créé" : "Robot enregistré"}')">${isNew ? "Créer le robot" : "Enregistrer"}</button>`;
  }
  function openSheet(kind, arg) {
    $overlay.innerHTML = `<div class="scrim m-anim-scrim-in" onclick="__closeSheet()"></div><div class="sheet m-anim-sheet-in">${SHEETS[kind](arg)}</div>`;
  }
  function closeSheet() {
    $overlay.innerHTML = "";
  }
  window.__sheet = openSheet;
  window.__closeSheet = closeSheet;

  /* ---- Toast -------------------------------------------------------------- */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast m-anim-toast-in";
    el.innerHTML = `<span style="color:var(--spark)">●</span><b>${msg}</b>`;
    $toasts.appendChild(el);
    setTimeout(() => {
      el.classList.add("m-anim-toast-out");
      setTimeout(() => el.remove(), 250);
    }, 2200);
  }
  window.__toast = toast;

  /* ---- Interactions ------------------------------------------------------- */
  window.__play = el => {
    el.style.transition = "transform .18s var(--ease-out), opacity .18s";
    el.style.transform = "translateY(-40px)";
    el.style.opacity = "0";
    setTimeout(() => {
      el.remove();
      toast("Carte jouée");
    }, 160);
  };
  window.__toggle = el => {
    const on = el.dataset.on === "true";
    el.dataset.on = String(!on);
    const knob = el.firstElementChild;
    el.style.background = !on ? "var(--accent)" : "var(--bg-4)";
    knob.style.left = !on ? "21px" : "3px";
    knob.style.background = !on ? "var(--text-on-accent)" : "var(--text-1)";
  };

  /* ---- Swipe-to-delete ---------------------------------------------------- */
  function bindSwipe() {
    document.querySelectorAll(".swipe-wrap").forEach(wrap => {
      const row = wrap.querySelector("[data-row]");
      let startX = 0,
        dx = 0,
        open = false;
      const onDown = e => {
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        row.style.transition = "none";
      };
      const onMove = e => {
        if (!startX) return;
        dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
        dx = Math.max(-96, Math.min(0, dx + (open ? -96 : 0)));
        row.style.transform = `translateX(${dx}px)`;
      };
      const onUp = () => {
        row.style.transition = "transform .2s var(--ease-out)";
        open = dx < -48;
        row.style.transform = `translateX(${open ? -96 : 0}px)`;
        startX = 0;
        if (open) {
          const bg = wrap.querySelector(".swipe-bg");
          bg.onclick = () => {
            wrap.style.transition = "opacity .2s,transform .2s";
            wrap.style.opacity = "0";
            wrap.style.transform = "translateX(-100%)";
            setTimeout(() => {
              wrap.remove();
              toast("Robot supprimé");
            }, 200);
          };
        }
      };
      row.addEventListener("touchstart", onDown);
      row.addEventListener("touchmove", onMove);
      row.addEventListener("touchend", onUp);
      row.addEventListener("mousedown", e => {
        onDown(e);
        const mm = ev => onMove(ev);
        const mu = () => {
          onUp();
          document.removeEventListener("mousemove", mm);
          document.removeEventListener("mouseup", mu);
        };
        document.addEventListener("mousemove", mm);
        document.addEventListener("mouseup", mu);
      });
    });
  }

  /* ---- Boot --------------------------------------------------------------- */
  nav("home");
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/app.js", error: String((e && e.message) || e) }); }

// ui_kits/web/GameScreen.jsx
try { (() => {
// Écran ENTRAÎNEMENT / partie — flagship. Tapis 2/3 + panneaux droits 1/3.
const {
  ScoreBoard,
  TableFelt,
  PlayingCard,
  AnnounceStream,
  LogConsole,
  ControlBar,
  Button,
  Badge
} = window.ContrEDesignSystem_9c78ea;
const START_HAND = [{
  rank: "A",
  suit: "hearts"
}, {
  rank: "10",
  suit: "hearts"
}, {
  rank: "R",
  suit: "spades"
}, {
  rank: "9",
  suit: "spades"
}, {
  rank: "V",
  suit: "clubs"
}, {
  rank: "8",
  suit: "diamonds"
}, {
  rank: "7",
  suit: "diamonds"
}];
function GameScreen() {
  const [hand, setHand] = React.useState(START_HAND);
  const [trick, setTrick] = React.useState({
    west: {
      rank: "9",
      suit: "hearts"
    },
    north: {
      rank: "7",
      suit: "hearts"
    }
  });
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(2);
  const [before, setBefore] = React.useState(400);
  const [after, setAfter] = React.useState(700);
  const playCard = i => {
    const card = hand[i];
    setTrick(t => ({
      ...t,
      south: {
        ...card,
        winning: true
      }
    }));
    setHand(h => h.filter((_, idx) => idx !== i));
  };
  const log = [{
    ts: "12:04:01",
    level: "info",
    msg: "donne 4 — distribution 3-2-3"
  }, {
    ts: "12:04:01",
    level: "debug",
    msg: "eval main Sud = 0.71 · atout ♥"
  }, {
    ts: "12:04:01",
    level: "warning",
    msg: "annonce capot à risque (concentration 0.4)"
  }, {
    ts: "12:04:02",
    level: "info",
    msg: "pli 3 remporté par Sud (R♥)"
  }, {
    ts: "12:04:02",
    level: "debug",
    msg: "ws → state.tick #482"
  }, {
    ts: "12:04:02",
    level: "error",
    msg: "contrat menacé — équipe B à 148/150"
  }];
  const stream = [{
    player: "Vous",
    team: "a",
    kind: "bid",
    value: 80,
    suit: "spades"
  }, {
    player: "Iznogoud",
    team: "b",
    isRobot: true,
    kind: "bid",
    value: 90,
    suit: "hearts"
  }, {
    player: "Partenaire",
    team: "a",
    kind: "bid",
    value: 110,
    suit: "spades"
  }, {
    player: "Roboubelot",
    team: "b",
    isRobot: true,
    kind: "contre"
  }, {
    player: "Vous",
    team: "a",
    kind: "surcontre"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "layout-game"
  }, /*#__PURE__*/React.createElement("div", {
    className: "layout-game__table"
  }, /*#__PURE__*/React.createElement(ScoreBoard, {
    teamA: {
      name: "Les Atouts",
      score: 1240
    },
    teamB: {
      name: "Capot City",
      score: 980
    },
    target: 1500,
    round: 2,
    rounds: 3,
    brut: {
      a: 82,
      b: 80
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(TableFelt, {
    atout: "hearts",
    seats: [{
      dir: "south",
      name: "Vous",
      team: "Les Atouts",
      cards: hand.length,
      active: true
    }, {
      dir: "west",
      name: "Iznogoud",
      team: "Capot City",
      isRobot: true,
      cards: 6
    }, {
      dir: "north",
      name: "Partenaire",
      team: "Les Atouts",
      cards: 6
    }, {
      dir: "east",
      name: "Roboubelot",
      team: "Capot City",
      isRobot: true,
      cards: 7
    }],
    trick: trick,
    prevTrick: [{
      rank: "R",
      suit: "spades"
    }, {
      rank: "7",
      suit: "spades"
    }, {
      rank: "8",
      suit: "spades",
      winning: true
    }, {
      rank: "D",
      suit: "spades"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      gap: 8,
      padding: "4px 0 2px",
      minHeight: 96
    }
  }, hand.map((c, i) => /*#__PURE__*/React.createElement(PlayingCard, {
    key: `${c.rank}${c.suit}`,
    rank: c.rank,
    suit: c.suit,
    size: "lg",
    playable: true,
    onClick: () => playCard(i)
  })), hand.length === 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)",
      paddingBottom: 32
    }
  }, "Main jou\xE9e \u2014 pli en cours.")), /*#__PURE__*/React.createElement(ControlBar, {
    playing: playing,
    speed: speed,
    delayBefore: before,
    delayAfter: after,
    onTogglePlay: () => setPlaying(p => !p),
    onStep: () => {},
    onSpeed: setSpeed,
    onDelayBefore: setBefore,
    onDelayAfter: setAfter
  })), /*#__PURE__*/React.createElement("div", {
    className: "layout-game__side"
  }, /*#__PURE__*/React.createElement(AnnounceStream, {
    entries: stream
  }), /*#__PURE__*/React.createElement(LogConsole, {
    defaultHidden: ["trace"],
    entries: log
  })));
}
window.GameScreen = GameScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/GameScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/LobbyScreen.jsx
try { (() => {
// Écran LOBBY — filtres + grille de tables.
const {
  Card: LCard,
  Badge: LBadge,
  Button: LButton,
  Tag: LTag,
  TeamBadge: LTeamBadge,
  Input: LInput
} = window.ContrEDesignSystem_9c78ea;
const TABLES = [{
  id: 214,
  teamA: "Les Atouts",
  teamB: "Capot City",
  round: "Manche 2/3",
  players: 2,
  bots: 2,
  watchers: 7,
  live: true,
  private: false
}, {
  id: 198,
  teamA: "Pique & Coeur",
  teamB: "Belote Club",
  round: "Enchères",
  players: 3,
  bots: 1,
  watchers: 2,
  live: true,
  private: false
}, {
  id: 231,
  teamA: "Les Carreaux",
  teamB: "—",
  round: "En attente",
  players: 1,
  bots: 0,
  watchers: 0,
  live: false,
  private: true
}, {
  id: 240,
  teamA: "Trèfle FC",
  teamB: "Capot City",
  round: "Manche 1/2",
  players: 4,
  bots: 0,
  watchers: 12,
  live: true,
  private: false
}, {
  id: 245,
  teamA: "Les Atouts",
  teamB: "—",
  round: "En attente",
  players: 2,
  bots: 2,
  watchers: 0,
  live: false,
  private: false
}, {
  id: 251,
  teamA: "Roi & Dame",
  teamB: "Belote Club",
  round: "Manche 3/3",
  players: 4,
  bots: 0,
  watchers: 23,
  live: true,
  private: false
}];
function LobbyScreen() {
  const [q, setQ] = React.useState("");
  const [showPrivate, setShowPrivate] = React.useState(true);
  const [liveOnly, setLiveOnly] = React.useState(false);
  const tables = TABLES.filter(t => (showPrivate || !t.private) && (!liveOnly || t.live) && `${t.id} ${t.teamA} ${t.teamB}`.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "layout-lobby"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "layout-lobby__filters"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h2)",
      color: "var(--text-1)"
    }
  }, "Lobby"), /*#__PURE__*/React.createElement(LInput, {
    placeholder: "Rechercher une table\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    iconLeft: window.Ic.search()
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-xs)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-3)"
    }
  }, "Filtres"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(LTag, {
    selected: showPrivate,
    onClick: () => setShowPrivate(v => !v)
  }, "Priv\xE9es"), /*#__PURE__*/React.createElement(LTag, {
    selected: liveOnly,
    onClick: () => setLiveOnly(v => !v)
  }, "En direct"))), /*#__PURE__*/React.createElement(LButton, {
    variant: "primary",
    iconLeft: window.Ic.plus(),
    fullWidth: true
  }, "Cr\xE9er une table")), /*#__PURE__*/React.createElement("div", {
    className: "layout-lobby__grid"
  }, tables.map(t => /*#__PURE__*/React.createElement(LCard, {
    key: t.id,
    interactive: true,
    elevated: true,
    padding: "none",
    header: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, "Table #", t.id, t.private && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-3)",
        display: "flex"
      }
    }, window.Ic.lock())), t.live ? /*#__PURE__*/React.createElement(LBadge, {
      tone: "spark",
      dot: true
    }, "Live") : /*#__PURE__*/React.createElement(LBadge, {
      tone: "neutral"
    }, "Ouverte"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(LTeamBadge, {
    name: t.teamA,
    size: 34,
    showName: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)"
    }
  }, "vs"), t.teamB !== "—" ? /*#__PURE__*/React.createElement(LTeamBadge, {
    name: t.teamB,
    size: 34
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)"
    }
  }, "1 place")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--fs-sm)",
      color: "var(--text-2)"
    }
  }, /*#__PURE__*/React.createElement("span", null, t.round), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text-3)"
    }
  }, t.players, "\uD83D\uDC64 \xB7 ", t.bots, " BOT \xB7 ", t.watchers, "\uD83D\uDC41")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LButton, {
    variant: t.live ? "secondary" : "primary",
    size: "sm",
    fullWidth: true
  }, t.live ? "Rejoindre" : "S'asseoir"), t.live && /*#__PURE__*/React.createElement(LButton, {
    variant: "ghost",
    size: "sm",
    iconLeft: window.Ic.eye({
      width: 16,
      height: 16
    })
  }, "Observer")))))));
}
window.LobbyScreen = LobbyScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/LobbyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/RobotsScreen.jsx
try { (() => {
// Écran MES ROBOTS — liste + détail/édition (sliders) + comparaison côte à côte.
const {
  Card: RCard,
  Badge: RBadge,
  Button: RButton,
  Slider: RSlider,
  Select: RSelect,
  Switch: RSwitch,
  Input: RInput
} = window.ContrEDesignSystem_9c78ea;
const ROBOTS = [{
  id: 1,
  name: "Iznogoud",
  agr: 0.82,
  conc: 0.6,
  vel: 0.7,
  conv: "aggressive",
  active: true,
  win: 73,
  avg: 128,
  games: 1204
}, {
  id: 2,
  name: "Roboubelot",
  agr: 0.4,
  conc: 0.85,
  vel: 0.5,
  conv: "classique",
  active: true,
  win: 68,
  avg: 119,
  games: 980
}, {
  id: 3,
  name: "Le Prudent",
  agr: 0.2,
  conc: 0.95,
  vel: 0.3,
  conv: "soft",
  active: false,
  win: 61,
  avg: 104,
  games: 412
}, {
  id: 4,
  name: "Capot-or",
  agr: 0.95,
  conc: 0.5,
  vel: 0.9,
  conv: "aggressive",
  active: true,
  win: 70,
  avg: 134,
  games: 1560
}];
function Stat({
  label,
  value,
  suffix
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-xs)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-3)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--fs-h2)",
      color: "var(--text-1)"
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--text-3)",
      marginLeft: 2
    }
  }, suffix)));
}
function RobotEditor({
  bot,
  onChange
}) {
  return /*#__PURE__*/React.createElement(RCard, {
    padding: "lg",
    header: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xC9dition \xB7 ", bot.name), /*#__PURE__*/React.createElement(RSwitch, {
      checked: bot.active,
      onChange: v => onChange({
        ...bot,
        active: v
      }),
      label: "Actif"
    }))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Contrat r\xE9ussi",
    value: bot.win,
    suffix: "%"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Pts / donne",
    value: bot.avg,
    suffix: ""
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Parties",
    value: bot.games.toLocaleString("fr-FR"),
    suffix: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(RInput, {
    label: "Nom",
    value: bot.name,
    onChange: e => onChange({
      ...bot,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement(RSlider, {
    label: "Agressivit\xE9",
    value: bot.agr,
    min: 0,
    max: 1,
    onChange: v => onChange({
      ...bot,
      agr: v
    }),
    format: v => v.toFixed(2)
  }), /*#__PURE__*/React.createElement(RSlider, {
    label: "Concentration",
    value: bot.conc,
    min: 0,
    max: 1,
    onChange: v => onChange({
      ...bot,
      conc: v
    }),
    format: v => v.toFixed(2)
  }), /*#__PURE__*/React.createElement(RSlider, {
    label: "V\xE9locit\xE9",
    value: bot.vel,
    min: 0,
    max: 1,
    onChange: v => onChange({
      ...bot,
      vel: v
    }),
    format: v => v.toFixed(2)
  }), /*#__PURE__*/React.createElement(RSelect, {
    label: "Convention d'ench\xE8res",
    value: bot.conv,
    onChange: v => onChange({
      ...bot,
      conv: v
    }),
    options: [{
      value: "classique",
      label: "Classique"
    }, {
      value: "soft",
      label: "Soft"
    }, {
      value: "aggressive",
      label: "Agressive"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(RButton, {
    variant: "primary"
  }, "Enregistrer"), /*#__PURE__*/React.createElement(RButton, {
    variant: "secondary",
    iconLeft: window.Ic.copy()
  }, "Dupliquer"), /*#__PURE__*/React.createElement(RButton, {
    variant: "ghost",
    style: {
      marginLeft: "auto",
      color: "var(--error)"
    }
  }, "Supprimer")));
}
function RobotsScreen() {
  const [bots, setBots] = React.useState(ROBOTS);
  const [selId, setSelId] = React.useState(1);
  const [compare, setCompare] = React.useState(false);
  const [cmpId, setCmpId] = React.useState(4);
  const sel = bots.find(b => b.id === selId);
  const cmp = bots.find(b => b.id === cmpId);
  const update = next => setBots(bs => bs.map(b => b.id === next.id ? next : b));
  return /*#__PURE__*/React.createElement("div", {
    className: "layout-robots"
  }, /*#__PURE__*/React.createElement("div", {
    className: "layout-robots__list"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h2)",
      color: "var(--text-1)"
    }
  }, "Mes robots"), /*#__PURE__*/React.createElement(RButton, {
    size: "sm",
    iconLeft: window.Ic.plus()
  }, "Nouveau")), bots.map(b => /*#__PURE__*/React.createElement("button", {
    key: b.id,
    onClick: () => setSelId(b.id),
    className: "focus-ring",
    style: {
      textAlign: "left",
      border: `1px solid ${selId === b.id ? "var(--accent-line)" : "var(--border-1)"}`,
      background: selId === b.id ? "var(--accent-ghost)" : "var(--bg-2)",
      borderRadius: "var(--r-md)",
      padding: "12px 14px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text-1)",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, b.name, !b.active && /*#__PURE__*/React.createElement(RBadge, {
    tone: "neutral"
  }, "off")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-xs)",
      color: "var(--text-3)"
    }
  }, b.win, "% \xB7 ", b.avg, " pts \xB7 ", b.conv)), /*#__PURE__*/React.createElement(RBadge, {
    tone: "accent"
  }, b.games > 1000 ? "Pro" : "Rookie"))), /*#__PURE__*/React.createElement(RButton, {
    variant: "ghost",
    size: "sm",
    onClick: () => setCompare(c => !c),
    style: {
      marginTop: 8
    }
  }, compare ? "← Revenir au détail" : "Comparer deux robots")), /*#__PURE__*/React.createElement("div", {
    className: "layout-robots__detail"
  }, compare ? /*#__PURE__*/React.createElement("div", {
    className: "layout-robots__compare"
  }, /*#__PURE__*/React.createElement(RobotEditor, {
    bot: sel,
    onChange: update
  }), /*#__PURE__*/React.createElement(RobotEditor, {
    bot: cmp,
    onChange: update
  })) : /*#__PURE__*/React.createElement(RobotEditor, {
    bot: sel,
    onChange: update
  })));
}
window.RobotsScreen = RobotsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/RobotsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/TournamentScreen.jsx
try { (() => {
// Écran TOURNOIS — classement des équipes + fiche tournoi.
const {
  Card: TCard,
  Badge: TBadge,
  Button: TButton,
  TeamBadge: TTeamBadge
} = window.ContrEDesignSystem_9c78ea;
const STANDINGS = [{
  rank: 1,
  name: "Les Atouts",
  pts: 4820,
  games: 38
}, {
  rank: 2,
  name: "Capot City",
  pts: 4510,
  games: 40
}, {
  rank: 3,
  name: "Roi & Dame",
  pts: 4180,
  games: 36
}, {
  rank: 4,
  name: "Pique & Coeur",
  pts: 3990,
  games: 39
}, {
  rank: 5,
  name: "Trèfle FC",
  pts: 3720,
  games: 35
}, {
  rank: 6,
  name: "Belote Club",
  pts: 3110,
  games: 37
}];
function TournamentScreen() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(TButton, {
    variant: "primary",
    size: "sm"
  }, "Actifs"), /*#__PURE__*/React.createElement(TButton, {
    variant: "ghost",
    size: "sm"
  }, "\xC0 venir"), /*#__PURE__*/React.createElement(TButton, {
    variant: "ghost",
    size: "sm"
  }, "Termin\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "layout-tournament"
  }, /*#__PURE__*/React.createElement("div", {
    className: "layout-tournament__board"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 8px",
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h2)",
      color: "var(--text-1)"
    }
  }, "Coupe d'Automne \xB7 classement"), STANDINGS.map(s => {
    const mine = s.name === "Les Atouts";
    return /*#__PURE__*/React.createElement("div", {
      key: s.rank,
      style: {
        display: "grid",
        gridTemplateColumns: "28px 1fr auto auto",
        alignItems: "center",
        gap: 14,
        padding: "10px 14px",
        borderRadius: "var(--r-md)",
        background: mine ? "var(--accent-ghost)" : "var(--bg-2)",
        border: `1px solid ${mine ? "var(--accent-line)" : "var(--border-1)"}`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "var(--fs-h3)",
        color: s.rank <= 3 ? "var(--accent)" : "var(--text-3)"
      }
    }, s.rank), /*#__PURE__*/React.createElement(TTeamBadge, {
      name: s.name,
      size: 32,
      showName: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-sm)",
        color: "var(--text-3)"
      }
    }, s.games, " parties"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "var(--fs-h3)",
        color: "var(--text-1)"
      }
    }, s.pts.toLocaleString("fr-FR")));
  })), /*#__PURE__*/React.createElement("aside", {
    className: "layout-tournament__aside"
  }, /*#__PURE__*/React.createElement(TCard, {
    padding: "lg",
    header: "Coupe d'Automne"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(TBadge, {
    tone: "spark",
    dot: true
  }, "En cours"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)"
    }
  }, "jusqu'au 30 nov.")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-2)",
      fontSize: "var(--fs-sm)",
      lineHeight: 1.5
    }
  }, "Comp\xE9tition entre 12 clans. Les points de r\xE9compense s'accumulent \xE0 chaque partie en ligne (base 100 + \xE9cart de score + primes)."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderTop: "1px solid var(--border-1)",
      borderBottom: "1px solid var(--border-1)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-3)",
      fontSize: "var(--fs-sm)"
    }
  }, "Votre rang"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      color: "var(--accent)"
    }
  }, "1", /*#__PURE__*/React.createElement("sup", null, "er"), " \xB7 4 820 pts")), /*#__PURE__*/React.createElement(TButton, {
    variant: "primary",
    fullWidth: true
  }, "Rejoindre une partie class\xE9e"))))));
}
window.TournamentScreen = TournamentScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/TournamentScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/app.jsx
try { (() => {
// Shell de l'application web : brand + nav latérale + topbar + screen switch.
const {
  TeamBadge: ATeamBadge,
  Button: AButton,
  Badge: ABadge
} = window.ContrEDesignSystem_9c78ea;
const NAV = [{
  id: "game",
  label: "Entraînement",
  icon: "play"
}, {
  id: "lobby",
  label: "Lobby",
  icon: "cards"
}, {
  id: "watch",
  label: "Regarder",
  icon: "eye"
}, {
  id: "robots",
  label: "Mes robots",
  icon: "bot"
}, {
  id: "tournaments",
  label: "Tournois",
  icon: "trophy"
}];
function NavItem({
  item,
  active,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "focus-ring",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: "var(--r-md)",
      border: 0,
      cursor: "pointer",
      background: active ? "var(--accent-ghost)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-2)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body)",
      fontWeight: active ? 600 : 500
    }
  }, window.Ic[item.icon](), /*#__PURE__*/React.createElement("span", null, item.label));
}
function App() {
  const [screen, setScreen] = React.useState("game");
  const Screen = {
    game: window.GameScreen,
    lobby: window.LobbyScreen,
    robots: window.RobotsScreen,
    tournaments: window.TournamentScreen,
    watch: window.LobbyScreen
  }[screen];
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-shell__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/mark-contree.svg",
    alt: "",
    width: "26",
    height: "26"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--fs-h3)",
      color: "var(--text-1)"
    }
  }, "Contr\xE9e")), /*#__PURE__*/React.createElement("div", {
    className: "app-shell__topbar"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h3)",
      fontWeight: 600,
      color: "var(--text-1)"
    }
  }, NAV.find(n => n.id === screen)?.label), screen === "watch" && /*#__PURE__*/React.createElement(ABadge, {
    tone: "spark",
    dot: true
  }, "Mode spectateur")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ABadge, {
    tone: "accent",
    solid: true
  }, "4 820 pts"), /*#__PURE__*/React.createElement(ATeamBadge, {
    name: "Les Atouts",
    size: 32,
    showName: true
  }))), /*#__PURE__*/React.createElement("nav", {
    className: "app-shell__nav"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.id,
    item: n,
    active: screen === n.id,
    onClick: () => setScreen(n.id)
  })))), /*#__PURE__*/React.createElement("main", {
    className: "app-shell__main"
  }, Screen ? /*#__PURE__*/React.createElement(Screen, null) : null));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Jeu d'icônes line (style Lucide, stroke 2). Partagé par les écrans du kit.
const Ic = {
  play: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "m6 3 14 9-14 9V3Z"
  })),
  cards: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "13",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 5V3M12 5V3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m18 8 3 1-3 9-3-1"
  })),
  bot: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "8",
    width: "16",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8V4M9 4h6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "14",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "14",
    r: "1"
  })),
  eye: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  trophy: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M6 9a6 6 0 0 0 12 0V4H6v5Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 21h6M12 17v4"
  })),
  user: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 21a8 8 0 0 1 16 0"
  })),
  settings: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8Z"
  })),
  plus: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  lock: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "11",
    width: "16",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V7a4 4 0 0 1 8 0v4"
  })),
  copy: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "11",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15V5a2 2 0 0 1 2-2h10"
  })),
  search: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  }))
};
window.Ic = Ic;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AnnouncePopup = __ds_scope.AnnouncePopup;

__ds_ns.AnnounceStream = __ds_scope.AnnounceStream;

__ds_ns.BidBadge = __ds_scope.BidBadge;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.ControlBar = __ds_scope.ControlBar;

__ds_ns.LogConsole = __ds_scope.LogConsole;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.RecapTable = __ds_scope.RecapTable;

__ds_ns.ScoreBoard = __ds_scope.ScoreBoard;

__ds_ns.TeamBadge = __ds_scope.TeamBadge;

__ds_ns.PlayingCard = __ds_scope.PlayingCard;

__ds_ns.TableFelt = __ds_scope.TableFelt;

})();
