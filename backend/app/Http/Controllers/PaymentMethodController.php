<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentMethodController extends Controller
{
    public function index(Request $request)
    {
        $methods = PaymentMethod::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($methods);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type'      => ['required', Rule::in(['card', 'whish', 'omt', 'paypal'])],
            'brand'     => ['required', 'string', 'max:20'],
            'last_four' => ['required', 'string', 'size:4'],
        ]);

        $userId   = $request->user()->id;
        $isFirst  = PaymentMethod::where('user_id', $userId)->count() === 0;
        $label    = $this->buildLabel($data['brand'], $data['last_four']);

        if ($isFirst) {
            $data['is_default'] = true;
        }

        $method = PaymentMethod::create([
            'user_id'   => $userId,
            'type'      => $data['type'],
            'brand'     => $data['brand'],
            'label'     => $label,
            'last_four' => $data['last_four'],
            'is_default' => $isFirst,
        ]);

        return response()->json($method, 201);
    }

    public function setDefault(Request $request, PaymentMethod $paymentMethod)
    {
        $this->authorizeMethod($request, $paymentMethod);

        PaymentMethod::where('user_id', $request->user()->id)
            ->update(['is_default' => false]);

        $paymentMethod->update(['is_default' => true]);

        return response()->json($paymentMethod->fresh());
    }

    public function destroy(Request $request, PaymentMethod $paymentMethod)
    {
        $this->authorizeMethod($request, $paymentMethod);
        $paymentMethod->delete();

        // If we just deleted the default, promote the most recent remaining one.
        if ($paymentMethod->is_default) {
            PaymentMethod::where('user_id', $request->user()->id)
                ->latest()
                ->first()
                ?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Payment method removed.']);
    }

    private function authorizeMethod(Request $request, PaymentMethod $method): void
    {
        abort_if($method->user_id !== $request->user()->id, 403);
    }

    private function buildLabel(string $brand, string $lastFour): string
    {
        $name = match (strtolower($brand)) {
            'visa'       => 'Visa',
            'mastercard' => 'Mastercard',
            'whish'      => 'Whish',
            'omt'        => 'OMT',
            'paypal'     => 'PayPal',
            default      => ucfirst($brand),
        };

        return "{$name} •••• {$lastFour}";
    }
}
