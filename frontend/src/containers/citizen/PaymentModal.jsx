import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  red: "#B91C1C",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

// ─── Payment method definitions ───────────────────────────────────────────────
const METHOD_TYPES = [
  { key: "visa",       label: "Visa",        icon: "card-outline",    color: "#1A1F71", type: "card",   brand: "visa" },
  { key: "mastercard", label: "Mastercard",  icon: "card-outline",    color: "#EB001B", type: "card",   brand: "mastercard" },
  { key: "whish",      label: "Whish Money", icon: "phone-portrait-outline", color: "#00A86B", type: "whish",  brand: "whish" },
  { key: "omt",        label: "OMT",         icon: "cash-outline",    color: "#FF6B00", type: "omt",    brand: "omt" },
  { key: "paypal",     label: "PayPal",      icon: "logo-paypal",     color: "#003087", type: "paypal", brand: "paypal" },
];

function detectBrand(cardNumber) {
  const first = cardNumber.replace(/\s/g, "")[0];
  if (first === "4") return "visa";
  if (first === "5") return "mastercard";
  return "card";
}

function formatCardNumber(raw) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-4);
}

function maskEmail(email) {
  return email.slice(-4).replace(/[@.]/g, "x");
}

// ─── Brand icon badge ─────────────────────────────────────────────────────────
function BrandBadge({ brand, size = 18 }) {
  const method = METHOD_TYPES.find((m) => m.brand === brand) || METHOD_TYPES[0];
  return (
    <View style={[s.brandBadge, { backgroundColor: method.color + "18" }]}>
      <Ionicons name={method.icon} size={size} color={method.color} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentModal({ visible, onClose, issue, onSuccess }) {
  const [step, setStep]                 = useState("method"); // method | new_card | new_wallet | confirm | processing | success | failed
  const [savedMethods, setSavedMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null); // saved PaymentMethod object OR new method object
  const [selectedType, setSelectedType]     = useState(null); // METHOD_TYPES entry for new method

  // New card form
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvv, setCvv]               = useState("");
  const [cardName, setCardName]     = useState("");

  // New wallet form (Whish / OMT)
  const [walletPhone, setWalletPhone] = useState("");

  // New PayPal form
  const [paypalEmail, setPaypalEmail] = useState("");

  // Custom amount
  const [customAmount, setCustomAmount] = useState("");

  // Save toggle
  const [saveMethod, setSaveMethod] = useState(false);

  // Inline form errors
  const [formError, setFormError] = useState("");

  // Result
  const [reference, setReference]   = useState("");
  const [errorMsg, setErrorMsg]     = useState("");

  useEffect(() => {
    if (visible) {
      resetForm();
      loadSavedMethods();
    }
  }, [visible]);

  const resetForm = () => {
    setStep("method");
    setSelectedMethod(null);
    setSelectedType(null);
    setCardNumber(""); setExpiry(""); setCvv(""); setCardName("");
    setWalletPhone(""); setPaypalEmail("");
    setCustomAmount("");
    setSaveMethod(false);
    setFormError("");
    setReference(""); setErrorMsg("");
  };

  const loadSavedMethods = async () => {
    try {
      setLoadingMethods(true);
      const { data } = await api.get("/payment-methods");
      setSavedMethods(data);
    } catch {
      setSavedMethods([]);
    } finally {
      setLoadingMethods(false);
    }
  };

  // ── Step: method selection ────────────────────────────────────────────────
  const validateAmount = () => {
    const val = parseFloat(customAmount);
    const max = parseFloat(amountDue);
    if (!customAmount || isNaN(val) || val <= 0) {
      setFormError("Please enter a valid amount.");
      return false;
    }
    if (val > max) {
      setFormError(`Maximum you can contribute is $${max}.`);
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSelectSaved = (method) => {
    if (!validateAmount()) return;
    setSelectedMethod({ saved: true, ...method });
    setStep("confirm");
  };

  const handleSelectNewType = (typeEntry) => {
    if (!validateAmount()) return;
    setSelectedType(typeEntry);
    if (typeEntry.type === "card") setStep("new_card");
    else if (typeEntry.type === "paypal") setStep("new_wallet");
    else setStep("new_wallet");
  };

  // ── Step: new card form → confirm ─────────────────────────────────────────
  const handleCardContinue = () => {
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 16) { setFormError("Enter a 16-digit card number."); return; }
    if (!expiry.match(/^\d{2}\/\d{2}$/)) { setFormError("Use MM/YY format for expiry."); return; }
    if (cvv.length < 3) { setFormError("Enter a valid CVV."); return; }
    setFormError("");

    const brand    = detectBrand(cardNumber);
    const lastFour = digits.slice(-4);

    setSelectedMethod({
      saved:     false,
      type:      "card",
      brand,
      last_four: lastFour,
      label:     `${brand === "visa" ? "Visa" : "Mastercard"} •••• ${lastFour}`,
    });
    setStep("confirm");
  };

  // ── Step: new wallet/paypal form → confirm ────────────────────────────────
  const handleWalletContinue = () => {
    if (selectedType.type === "paypal") {
      if (!paypalEmail.includes("@")) { setFormError("Enter a valid email address."); return; }
      const lastFour = maskEmail(paypalEmail);
      setSelectedMethod({
        saved:     false,
        type:      "paypal",
        brand:     "paypal",
        last_four: lastFour,
        label:     `PayPal •••• ${lastFour}`,
      });
    } else {
      const digits = walletPhone.replace(/\D/g, "");
      if (digits.length < 8) { setFormError("Enter a valid phone number."); return; }
      const lastFour = maskPhone(walletPhone);
      setSelectedMethod({
        saved:     false,
        type:      selectedType.type,
        brand:     selectedType.brand,
        last_four: lastFour,
        label:     `${selectedType.label} •••• ${lastFour}`,
      });
    }
    setFormError("");
    setStep("confirm");
  };

  // ── Step: confirm → pay ───────────────────────────────────────────────────
  const handlePay = async () => {
    setStep("processing");

    try {
      const payload = { amount: parseFloat(customAmount) };

      if (selectedMethod.saved) {
        payload.payment_method_id = selectedMethod.id;
      } else {
        payload.type        = selectedMethod.type;
        payload.brand       = selectedMethod.brand;
        payload.last_four   = selectedMethod.last_four;
        payload.save_method = saveMethod;
      }

      const { data } = await api.post(`/issues/${issue.id}/pay`, payload);

      setReference(data.transaction?.reference || "");
      onSuccess(data.issue);
      setStep("success");

      if (saveMethod && !selectedMethod.saved) {
        loadSavedMethods();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Payment failed. Please try again.";
      setErrorMsg(msg);
      setStep("failed");
    }
  };

  const amountDue = issue
    ? Math.min(
        Number(issue.funding_goal) - Number(issue.funding_raised),
        Number(issue.funding_goal)
      ).toFixed(2)
    : "0.00";

  // ─── Render steps ────────────────────────────────────────────────────────
  const renderMethod = () => (
    <View style={s.body}>
      <Text style={s.amountLabel}>How much would you like to contribute?</Text>
      <View style={s.amountInputRow}>
        <Text style={s.amountDollar}>$</Text>
        <TextInput
          style={s.amountInput}
          value={customAmount}
          onChangeText={(v) => {
            setFormError("");
            setCustomAmount(v.replace(/[^0-9.]/g, ""));
          }}
          keyboardType="decimal-pad"
          placeholder={amountDue}
          placeholderTextColor={C.muted}
        />
      </View>
      <Text style={s.amountHint}>Remaining to fund: ${amountDue}</Text>

      {!!formError && (
        <View style={s.formErrorBox}>
          <Ionicons name="alert-circle-outline" size={14} color={C.red} />
          <Text style={s.formErrorText}>{formError}</Text>
        </View>
      )}

      {loadingMethods ? (
        <ActivityIndicator color={C.navy} style={{ marginVertical: 16 }} />
      ) : savedMethods.length > 0 ? (
        <>
          <Text style={s.sectionLabel}>SAVED METHODS</Text>
          {savedMethods.map((m) => (
            <Pressable key={m.id} style={s.savedRow} onPress={() => handleSelectSaved(m)}>
              <BrandBadge brand={m.brand} />
              <Text style={s.savedLabel}>{m.label}</Text>
              {m.is_default && <Text style={s.defaultTag}>Default</Text>}
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
          ))}
          <View style={s.divider} />
          <Text style={s.sectionLabel}>PAY WITH NEW METHOD</Text>
        </>
      ) : (
        <Text style={s.sectionLabel}>CHOOSE PAYMENT METHOD</Text>
      )}

      <View style={s.methodGrid}>
        {METHOD_TYPES.map((m) => (
          <Pressable key={m.key} style={s.methodTile} onPress={() => handleSelectNewType(m)}>
            <Ionicons name={m.icon} size={22} color={m.color} />
            <Text style={[s.methodTileLabel, { color: m.color }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderNewCard = () => (
    <View style={s.body}>
      <Text style={s.formTitle}>Card Details</Text>
      <Text style={s.formHint}>Your card number never leaves this device.</Text>

      <Text style={s.fieldLabel}>Card Number</Text>
      <TextInput
        style={s.input}
        value={cardNumber}
        onChangeText={(v) => setCardNumber(formatCardNumber(v))}
        keyboardType="number-pad"
        placeholder="0000 0000 0000 0000"
        placeholderTextColor={C.muted}
        maxLength={19}
      />

      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.fieldLabel}>Expiry (MM/YY)</Text>
          <TextInput
            style={s.input}
            value={expiry}
            onChangeText={(v) => {
              const d = v.replace(/\D/g, "").slice(0, 4);
              setExpiry(d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d);
            }}
            keyboardType="number-pad"
            placeholder="MM/YY"
            placeholderTextColor={C.muted}
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>CVV</Text>
          <TextInput
            style={s.input}
            value={cvv}
            onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            placeholder="•••"
            placeholderTextColor={C.muted}
            secureTextEntry
            maxLength={4}
          />
        </View>
      </View>

      <Text style={s.fieldLabel}>Cardholder Name</Text>
      <TextInput
        style={s.input}
        value={cardName}
        onChangeText={setCardName}
        autoCapitalize="words"
        placeholder="Name on card"
        placeholderTextColor={C.muted}
      />

      <View style={s.saveRow}>
        <Text style={s.saveLabel}>Save card for future payments</Text>
        <Switch
          value={saveMethod}
          onValueChange={setSaveMethod}
          trackColor={{ false: "#CBD5E1", true: C.navy + "75" }}
          thumbColor={saveMethod ? C.navy : "#fff"}
        />
      </View>

      {!!formError && (
        <View style={s.formErrorBox}>
          <Ionicons name="alert-circle-outline" size={14} color={C.red} />
          <Text style={s.formErrorText}>{formError}</Text>
        </View>
      )}

      <Pressable style={s.primaryBtn} onPress={handleCardContinue}>
        <Text style={s.primaryText}>Continue</Text>
      </Pressable>
    </View>
  );

  const renderNewWallet = () => {
    const isPayPal = selectedType?.type === "paypal";
    return (
      <View style={s.body}>
        <Text style={s.formTitle}>{selectedType?.label}</Text>
        <Text style={s.fieldLabel}>{isPayPal ? "PayPal Email" : "Phone Number"}</Text>
        <TextInput
          style={s.input}
          value={isPayPal ? paypalEmail : walletPhone}
          onChangeText={isPayPal ? setPaypalEmail : setWalletPhone}
          keyboardType={isPayPal ? "email-address" : "phone-pad"}
          autoCapitalize="none"
          placeholder={isPayPal ? "you@email.com" : "+961 XX XXX XXX"}
          placeholderTextColor={C.muted}
        />

        <View style={s.saveRow}>
          <Text style={s.saveLabel}>Save for future payments</Text>
          <Switch
            value={saveMethod}
            onValueChange={setSaveMethod}
            trackColor={{ false: "#CBD5E1", true: C.navy + "75" }}
            thumbColor={saveMethod ? C.navy : "#fff"}
          />
        </View>

        {!!formError && (
          <View style={s.formErrorBox}>
            <Ionicons name="alert-circle-outline" size={14} color={C.red} />
            <Text style={s.formErrorText}>{formError}</Text>
          </View>
        )}

        <Pressable style={s.primaryBtn} onPress={handleWalletContinue}>
          <Text style={s.primaryText}>Continue</Text>
        </Pressable>
      </View>
    );
  };

  const renderConfirm = () => (
    <View style={s.body}>
      <Text style={s.formTitle}>Confirm Payment</Text>

      <View style={s.confirmCard}>
        <BrandBadge brand={selectedMethod?.brand} size={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.confirmMethod}>{selectedMethod?.label}</Text>
          <Text style={s.confirmSub}>Tap Pay to complete</Text>
        </View>
      </View>

      <View style={s.confirmAmountRow}>
        <Text style={s.confirmAmountLabel}>Total</Text>
        <Text style={s.confirmAmountValue}>${parseFloat(customAmount).toFixed(2)}</Text>
      </View>

      <Pressable style={[s.primaryBtn, { backgroundColor: C.green }]} onPress={handlePay}>
        <Ionicons name="lock-closed" size={14} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.primaryText}>Pay ${parseFloat(customAmount).toFixed(2)}</Text>
      </Pressable>
    </View>
  );

  const renderProcessing = () => (
    <View style={[s.body, s.centered]}>
      <ActivityIndicator size="large" color={C.navy} />
      <Text style={s.processingText}>Processing payment…</Text>
      <Text style={s.processingHint}>Please don't close this screen</Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={[s.body, s.centered]}>
      <View style={s.resultIcon}>
        <Ionicons name="checkmark-circle" size={56} color={C.green} />
      </View>
      <Text style={s.resultTitle}>Payment Confirmed</Text>
      {!!reference && <Text style={s.referenceText}>Ref: {reference}</Text>}
      <Text style={s.resultSub}>Your contribution has been recorded.</Text>
      <Pressable style={[s.primaryBtn, { marginTop: 20 }]} onPress={onClose}>
        <Text style={s.primaryText}>Done</Text>
      </Pressable>
    </View>
  );

  const renderFailed = () => (
    <View style={[s.body, s.centered]}>
      <View style={s.resultIcon}>
        <Ionicons name="close-circle" size={56} color={C.red} />
      </View>
      <Text style={[s.resultTitle, { color: C.red }]}>Payment Failed</Text>
      <Text style={s.resultSub}>{errorMsg}</Text>
      <Pressable style={[s.primaryBtn, { marginTop: 20, backgroundColor: C.red }]} onPress={() => setStep("confirm")}>
        <Text style={s.primaryText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const stepTitle = {
    method:     "Pay for Issue",
    new_card:   "New Card",
    new_wallet: selectedType?.label || "New Method",
    confirm:    "Confirm",
    processing: "Processing",
    success:    "Success",
    failed:     "Failed",
  }[step] || "Payment";

  const canGoBack = ["new_card", "new_wallet", "confirm"].includes(step);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            {canGoBack ? (
              <Pressable onPress={() => setStep("method")} style={s.headerBack}>
                <Ionicons name="chevron-back" size={20} color={C.navy} />
              </Pressable>
            ) : (
              <View style={s.headerBack} />
            )}
            <Text style={s.headerTitle}>{stepTitle}</Text>
            {step !== "processing" ? (
              <Pressable onPress={onClose} style={s.headerClose}>
                <Ionicons name="close" size={20} color={C.navy} />
              </Pressable>
            ) : (
              <View style={s.headerClose} />
            )}
          </View>

          {/* Content */}
          {step === "method"     && renderMethod()}
          {step === "new_card"   && renderNewCard()}
          {step === "new_wallet" && renderNewWallet()}
          {step === "confirm"    && renderConfirm()}
          {step === "processing" && renderProcessing()}
          {step === "success"    && renderSuccess()}
          {step === "failed"     && renderFailed()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBack:  { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerClose: { width: 34, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  centered: { alignItems: "center", paddingVertical: 32 },

  amountLabel: { fontSize: 12, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  amountInputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.bg, marginBottom: 6 },
  amountDollar: { fontSize: 24, fontWeight: "900", color: C.navy, marginRight: 4 },
  amountInput: { flex: 1, height: 56, fontSize: 28, fontWeight: "900", color: C.navy },
  amountHint: { fontSize: 12, color: C.muted, fontWeight: "600", marginBottom: 10 },

  sectionLabel: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },

  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  savedLabel:  { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  defaultTag:  { fontSize: 10, fontWeight: "800", color: C.navy, backgroundColor: C.navy + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },

  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4, marginBottom: 8 },
  methodTile: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    gap: 6,
  },
  methodTileLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },

  brandBadge: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  formTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 4 },
  formHint:  { fontSize: 12, color: C.muted, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: C.muted, marginBottom: 4, marginTop: 10 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.bg,
  },
  row: { flexDirection: "row" },
  saveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 4 },
  saveLabel: { fontSize: 14, fontWeight: "500", color: C.text },

  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  confirmCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  confirmMethod: { fontSize: 15, fontWeight: "700", color: C.text },
  confirmSub:    { fontSize: 12, color: C.muted, marginTop: 2 },
  confirmAmountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  confirmAmountLabel: { fontSize: 14, color: C.muted, fontWeight: "600" },
  confirmAmountValue: { fontSize: 24, fontWeight: "900", color: C.navy },

  processingText: { fontSize: 16, fontWeight: "700", color: C.text, marginTop: 16 },
  processingHint: { fontSize: 12, color: C.muted, marginTop: 6 },

  resultIcon:  { marginBottom: 12 },
  resultTitle: { fontSize: 20, fontWeight: "900", color: C.green, marginBottom: 6 },
  resultSub:   { fontSize: 13, color: C.muted, textAlign: "center", marginHorizontal: 20 },
  referenceText: { fontSize: 11, color: C.muted, fontWeight: "600", marginBottom: 4, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  formErrorText: { flex: 1, fontSize: 13, color: C.red, fontWeight: "600" },
});
