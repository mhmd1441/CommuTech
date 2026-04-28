<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower((string) $this->input('email')),
            'first_name' => $this->input('first_name', $this->input('firstName')),
            'last_name' => $this->input('last_name', $this->input('lastName')),
            'password_confirmation' => $this->input(
                'password_confirmation',
                $this->input('confirmPassword')
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required_without:name', 'nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['required_with:first_name', 'nullable', 'string', 'min:2', 'max:80'],
            'name' => ['required_without:first_name', 'nullable', 'string', 'min:2', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/'],
            'role' => ['nullable', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'min:5', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'The phone number must start with +961 and contain 7 or 8 digits.',
            'password.confirmed' => 'The password confirmation does not match.',
        ];
    }
}
