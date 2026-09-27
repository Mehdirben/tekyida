import SwiftUI

// MARK: - Reusable Glass Input Field
// Icon + text/secure field inside the standard Liquid Glass input capsule.
// Replaces the copy-pasted `HStack { Image; TextField }.glassInputStyle(...)`
// pattern used across every form in the app.
public struct GlassInputField: View {
    let systemImage: String?
    let placeholder: String
    @Binding var text: String
    let isSecure: Bool
    let iconColor: Color
    let iconWidth: CGFloat
    let keyboard: UIKeyboardType
    let contentType: UITextContentType?
    let autocapitalization: TextInputAutocapitalization
    let disablesAutocorrection: Bool
    let characterLimit: Int?
    let isDisabled: Bool

    public init(
        systemImage: String? = nil,
        placeholder: String,
        text: Binding<String>,
        isSecure: Bool = false,
        iconColor: Color = .secondary,
        iconWidth: CGFloat = 20,
        keyboard: UIKeyboardType = .default,
        contentType: UITextContentType? = nil,
        autocapitalization: TextInputAutocapitalization = .sentences,
        disablesAutocorrection: Bool = false,
        characterLimit: Int? = nil,
        isDisabled: Bool = false
    ) {
        self.systemImage = systemImage
        self.placeholder = placeholder
        _text = text
        self.isSecure = isSecure
        self.iconColor = iconColor
        self.iconWidth = iconWidth
        self.keyboard = keyboard
        self.contentType = contentType
        self.autocapitalization = autocapitalization
        self.disablesAutocorrection = disablesAutocorrection
        self.characterLimit = characterLimit
        self.isDisabled = isDisabled
    }

    /// Character-limit rule shared by the field's `onChange` handler and
    /// tested directly so the truncation behavior stays pinned.
    static func clamp(_ value: String, to limit: Int?) -> String {
        guard let limit, value.count > limit else { return value }
        return String(value.prefix(limit))
    }

    public var body: some View {
        HStack(spacing: 12) {
            if let systemImage, !systemImage.isEmpty {
                Image(systemName: systemImage)
                    .foregroundColor(iconColor)
                    .frame(width: iconWidth)
            }

            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .keyboardType(keyboard)
            .textContentType(contentType)
            .textInputAutocapitalization(autocapitalization)
            .autocorrectionDisabled(disablesAutocorrection)
            .disabled(isDisabled)
            .onChange(of: text) { _, newValue in
                let clamped = GlassInputField.clamp(newValue, to: characterLimit)
                if clamped != newValue {
                    text = clamped
                }
            }
        }
        .glassInputStyle(cornerRadius: AppTheme.radiusInput)
    }
}
