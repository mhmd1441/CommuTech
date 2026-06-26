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
        $data = [];

        if ($this->has('email')) {
            $data['email'] = strtolower((string) $this->input('email'));
        }

        if ($this->has('roles') || $this->has('role')) {
            $data['roles'] = $this->input('roles', $this->filled('role') ? [$this->input('role')] : null);
        }

        if ($data !== []) {
            $this->merge($data);
        }

        if (blank($this->input('password')) || blank($this->input('password_confirmation'))) {
            $this->request->remove('password');
            $this->request->remove('password_confirmation');
        }
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'first_name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'father_name' => ['sometimes', 'nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'email' => ['sometimes', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['sometimes', 'regex:/^\+961\s?[0-9]{7,8}$/', Rule::unique('users', 'phone')->ignore($userId)],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['required', Rule::in(User::ROLES)],
            'country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'area' => ['sometimes', 'nullable', 'string', 'max:120'],
            'street' => ['sometimes', 'nullable', 'string', 'max:160'],
            'building' => ['sometimes', 'nullable', 'string', 'max:80'],
            'profile_picture_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'assigned_municipality' => ['sometimes', 'nullable', 'string', 'max:120'],
            'password' => ['sometimes', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function withValidator($validator): void
    {
        // Doing this as an array rule (e.g. Rule::requiredIf) doesn't work here: 'sometimes'
        // makes the validator skip the whole field — including the required check — whenever
        // it's absent from the request, which is exactly the case we need to catch (a PATCH
        // that adds the worker role but never sends a municipality at all).
        $validator->after(function ($validator) {
            $roles = $this->input('roles');
            $becomingWorker = is_array($roles) && in_array(User::ROLE_WORKER, $roles, true);

            if (! $becomingWorker) {
                return;
            }

            $hasExisting = filled($this->route('user')?->assigned_municipality);
            $municipalityMissing = $this->has('assigned_municipality')
                ? blank($this->input('assigned_municipality'))
                : ! $hasExisting;

            if ($municipalityMissing) {
                $validator->errors()->add('assigned_municipality', 'The assigned municipality field is required.');
            }
        });
    }
}
