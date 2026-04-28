<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => strtolower((string) $this->input('email')),
            ]);
        }
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:160'],
            'email' => ['sometimes', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['sometimes', 'regex:/^\+961\s?[0-9]{7,8}$/'],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'street' => ['sometimes', 'nullable', 'string', 'max:160'],
            'building' => ['sometimes', 'nullable', 'string', 'max:80'],
            'password' => ['sometimes', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }
}
